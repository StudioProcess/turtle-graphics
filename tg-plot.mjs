const VERSION = 1;

function create_ui() {
    const tmp = document.createElement('template');
    tmp.innerHTML = `<div style="font-family:system-ui; width:200px; height:100px; position:fixed; top:0; right:0;">
    <input class="server" placeholder="Server" value="ws://plotter-server.local:4321"></input><br>
    <button class="connect">Connect</button><span class="status">○</span><br>
    client id: <span class="client_id"></span><br>
    <span class="lines">0</span> lines<br>
    plotter queue: <span class="queue_len">–</span><br>
    your job: <span class="queue_pos">–</span><br>
    <button class="clear">Clear</button> <button class="plot">Plot</button> <button class="cancel">Cancel</button> <button class="savesvg">Save SVG</button>
    </div> `;
    const div = tmp.content.firstChild;
    document.body.appendChild(div);
    return div;
}

function to_path(lines, num_decimals = -1) {
    function dec(n) {
        if (num_decimals < 0) { return n; }
        return parseFloat( n.toFixed(num_decimals) ); // parse again to make sure that 1.00 -> 1
    }
    let d = '';
    // current point
    let cx;
    let cy;
    for (let [x0, y0, x1, y1] of lines) {
        if (x0 !== cx || y0 !== cy) { // starting point different than current point
            d += `M ${dec(x0)} ${dec(y0)} L ${dec(x1)} ${dec(y1)} `;
        } else { // continue from current point
            d += `${dec(x1)} ${dec(y1)} `;
        }
        // ending point new current point
        cx = x1;
        cy = y1;
    }
    d = d.trimEnd();
    return d;
}

// move to the center given by (cx, cy), then scale by (sx, sy)
function scale_lines(lines, sx = 1, sy = 1, cx = 0, cy = 0) {
    if (sy === undefined || sy === null) { sy = sx; }
    return lines.map( ([x0, y0, x1, y1]) => [
        sx * (x0 - cx), 
        sy * (y0 - cy), 
        sx * (x1 - cx), 
        sy * (y1 - cy) ] );
}

function get_bbox(lines) {
    let tl = [ Infinity,  Infinity]; // top left
    let br = [-Infinity, -Infinity]; // bottom right
    function check(x, y) {
        if ( x < tl[0] ) { tl[0] = x; }
        if ( x > br[0] ) { br[0] = x; }
        if ( y < tl[1] ) { tl[1] = y; }
        if ( y > br[1] ) { br[1] = y; }
    }
    for (let [x0, y0, x1, y1] of lines) {
        check(x0, y0);
        check(x1, y1);
    }
    return [ tl[0], tl[1], br[0]-tl[0], br[1]-tl[1] ];
}

// TODO: stroke width
function to_svg(lines, lines_viewbox = undefined, timestamp = undefined) {
    // label : [ width_mm, height_mm ]
    const sizes = {
        a3_landscape: [ 420, 297 ],
    };
    const margin = 0.05;
    const size = sizes.a3_landscape;
    
    if (lines_viewbox === undefined) { lines_viewbox = geb_bbox(lines); }     // if no viewbox given, calculate bounding box
    const center = [ lines_viewbox[0] + lines_viewbox[2]/2, lines_viewbox[1] + lines_viewbox[3]/2 ];
    const scale_w = size[0] / lines_viewbox[2];
    const scale_h = size[1] / lines_viewbox[3];
    const scale = Math.min(scale_w, scale_h) * (1 - margin);
    const scaled_lines = scale_lines(lines, scale, scale, center[0], center[1]);
    const stats = line_stats(scaled_lines);
    const d = to_path(scaled_lines);
    
    if (timestamp === undefined) {
        timestamp = (new Date()).toISOString();
    }
    
    const svg =`<!-- Created with tg-plot (v${VERSION}) at ${timestamp} -->
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:tg="https://sketch.process.studio/turtle-graphics"
     tg:count="${stats.count}" tg:travel="${Math.trunc(stats.travel)}" tg:travel_ink="${Math.trunc(stats.travel_ink)}" tg:travel_blank="${Math.trunc(stats.travel_blank)}"
     width="${size[0]}mm"
     height="${size[1]}mm"
     viewBox="-${size[0]/2} -${size[1]/2} ${size[0]} ${size[1]}"
     stroke="black" fill="none" stroke-linecap="round">
    <path d="${d}" />
</svg>`;
    return { svg, stats, timestamp };
}

function dist(x0, y0, x1, y1) {
    return Math.sqrt( (x1-x0)**2 + (y1-y0)**2 );
}

function line_stats(lines) {
    const stats = {
        count: lines.length,
        travel: 0,
        travel_ink: 0,
        travel_blank: 0
    };
    if (lines.length == 0) { return stats; }
    // previous end point
    let px = lines[0][0];
    let py = lines[0][1];
    for (let [x0, y0, x1, y1] of lines) {
        const blank = dist(px, py, x0, y0); // blank travel to line start
        const ink = dist(x0, y0, x1, y1); // line
        stats.travel_blank += blank;
        stats.travel_ink += ink;
        stats.travel += blank + ink;
        px = x1;
        py = y1;
    }
    return stats;
}

// Save text data to file
// Triggers download mechanism in the browser
function save_text(text, filename) {
    let link = document.createElement('a');
    link.download = filename;
    link.href = 'data:text/plain;charset=UTF-8,' + encodeURIComponent(text);
    link.style.display = 'none';     // Firefox
    document.body.appendChild(link); // Firefox
    link.click();
    document.body.removeChild(link); // Firefox
}

function autoconnect(options = {}) {
    const STATE = { 'disconnected':0, 'connecting':1, 'connected':2 };
    
    function callback(fn, ...args) {
        if (typeof fn === 'function') { fn(...args); }
    }
    
    options = Object.assign({
        connect_timeout: 10000,
        wait_before_reconnect: 0,
        retries: -1,
        on_connecting: undefined,
        on_waiting: undefined,
        on_connected: undefined,
        on_disconnected: undefined,
        on_message: undefined,
    }, options);
    
    let url;
    let socket;
    let timeout; // timeout used for connecting and waiting for retry
    let state = STATE.disconnected;
    let retries = 0;
    let should_stop = true;
    
    function retry() {
        if (options.retries > -1 && retries + 1 > options.retries) { 
            // no (more) retries
            callback(options.on_disconnected);
            return;
        }
        // console.log('retry');
        state = STATE.connecting;
        retries += 1;
        if (options.wait_before_reconnect >= 1000) {
            callback(options.on_waiting, retries);
        }
        timeout = setTimeout(connect, options.wait_before_reconnect);
    }
    
    function on_open(e) {
        clearTimeout(timeout);
        state = STATE.connected;
        callback(options.on_connected, socket);
    }
    
    function on_message(e) {
        callback(options.on_message, e);
    }
    
    function on_close_or_error(e) {
        // can be called due to:
        // * connect timeout (STATE.connecting) -> retry
        // * connection error (STATE.connected) -> retry
        // * intentional abort while connecting (STATE.connecting, should_stop)
        // * intentional abort while connected (STATE.connected, should_stop)
        
        if (state === STATE.disconnected) { return; } // make this idempotent
        // console.log('on_close_or_error', e.type);
        
        socket = null;
        clearTimeout(timeout);
        
        if (should_stop) { // intentional abort
            state = STATE.disconnected;
            callback(options.on_disconnected);
        } else {
            if (state === STATE.connected) { retries = 0; }
            state = STATE.disconnected;
            setTimeout(retry, 0);
        }
    }
    
    // make a connection attempt, with timeout and retries.
    function connect() {
        state = STATE.connecting;
        callback(options.on_connecting, retries);
        try {
            socket = new WebSocket(url);
            
            timeout = setTimeout(() => {
                socket?.close();
            }, options.connect_timeout);
            
            socket.onopen  = on_open;
            socket.onclose = on_close_or_error;
            socket.onerror = on_close_or_error;
            socket.onmessage = on_message;
        } catch (e) {
            // catches URL errors -> don't reconnect
            state = STATE.disconnected;
            callback(options.on_disconnected);
        }
    }
    
    function start(url_) {
        if (state !== STATE.disconnected) { return; }
        // console.log('starting');
        url = url_;
        retries = 0;
        should_stop = false;
        connect();
    }
    
    function stop() {
        if (state === STATE.disconnected) { return; }
        // console.log('stopping');
        clearTimeout(timeout);
        should_stop = true;
        if (socket) {
            socket.close();
        } else {
            state = STATE.disconnected;
            callback(options.on_disconnected);
        }
    }
    
    function toggle(url_) {
        if (state === STATE.disconnected) { start(url_); }
        else { stop(); }
    }
    
    function socket_() {
        return socket;
    }
    
    function send(data) {
        if (socket && socket.readyState === 1) { // OPEN
            socket.send(data);
        }
    }
    
    return { start, stop, toggle, send, socket:socket_ };
}

function get_client_id() {
    let client_id = localStorage.getItem('tg-plot:client_id');
    if (!client_id) {
        client_id = crypto.randomUUID().slice(0, 8); // new client id
        localStorage.setItem('tg-plot:client_id', client_id);
    }
    return client_id;
}


export function make_plotter_client(tg_instance) {
    let lines = [];
    
    const div = create_ui();
    const lines_span = div.querySelector('.lines');
    const client_id_span = div.querySelector('.client_id');
    const clear_button = div.querySelector('.clear');
    const cancel_button = div.querySelector('.cancel');
    const plot_button = div.querySelector('.plot');
    const status_span = div.querySelector('.status');
    const server_input = div.querySelector('.server');
    const connect_button = div.querySelector('.connect');
    const queue_pos_span = div.querySelector('.queue_pos');
    const queue_len_span = div.querySelector('.queue_len');
    const savesvg_button = div.querySelector('.savesvg');
    
    client_id_span.innerText = get_client_id();
    
    clear_button.onmousedown = () => {
        lines = [];
        lines_span.innerText = 0;
    };
    
    plot_button.onmousedown = () => {
        if (lines.length == 0) { return; }
        const { svg, timestamp, stats } = to_svg(lines, tg_instance._p5_viewbox);
        const msg = JSON.stringify({
            type: 'plot',
            client: client_id_span.innerText,
            id: crypto.randomUUID(),
            svg,
            stats
        });
        console.log(msg);
        ac.send(msg);
    }
    
    cancel_button.onmousedown = () => {
        const msg = JSON.stringify({
            type: 'cancel',
            client: client_id_span.innerText,
        });
        console.log(msg);
        ac.send(msg);
    }
    
    savesvg_button.onmousedown = () => {
        if (lines.length == 0) { return; }
        const { svg, timestamp, stats } = to_svg(lines, tg_instance._p5_viewbox);
        save_text(svg, timestamp + '.svg');
    }
    
    tg_instance.add_line_fn((...args) => {
        lines.push(args);
        lines_span.innerText = lines.length;
    });
    
    const ac = autoconnect({
        on_connecting: (retries) => {
            console.log('on_connecting')
            connect_button.innerText = 'Stop';
            status_span.innerText = `○ Connecting${retries > 0 ? ' (' + retries +')' : ''}...`;
            queue_pos_span.innerText = '–';
            queue_len_span.innerText = '–';
        },
        on_waiting: (retries) => {
            console.log('on_waiting')
            status_span.innerText = `○ Waiting${retries > 0 ? ' (' + retries +')' : ''}...`;
        },
        on_connected: (socket) => {
            console.log('on_connected')
            connect_button.innerText = 'Disconnect';
            status_span.innerText = '● Connected';
        },
        on_disconnected: () => {
            console.log('on_disconnected')
            connect_button.innerText = 'Connect';
            status_span.innerText = '○ Disconnected';
            queue_pos_span.innerText = '–';
            queue_len_span.innerText = '–';
        },
        on_message: (e) => {
            const msg = JSON.parse(e.data)
            console.log('on_message', msg);
            if (msg.type === 'queue_length') {
                queue_len_span.innerText = msg.length;
            }
            else if (msg.type === 'queue_position') {
                let pos;
                if (msg.position === 0) { pos = '🖨️📝 Ready to draw, load paper pen '; }
                else if (msg.position === -1) { pos = '🖨️ Drawing...'; }
                else { pos = "⌛ " + msg.position + " before you..."; }
                queue_pos_span.innerText = pos;
            }
            else if (msg.type === 'job_done') {
                queue_pos_span.innerText = '✔️ Done';
            }
            else if (msg.type === 'job_canceled') {
                queue_pos_span.innerText = '❌ Canceled';
            }
        },
    });
    
    connect_button.onmousedown = () => {
        ac.toggle(server_input.value);
    };
    
}

/*
if (globalThis?.addEventListener !== undefined) {
    const window = globalThis;
    window.addEventListener('DOMContentLoaded', e => {
        if (window?.p5) {
            // console.log('-> p5 detected (%s)', window.p5.VERSION);
            
            // proxy the global preload function
            // this is the earliest the p5 instance is available 
            // AND p5 functions are in the global scope (so we can overwrite them)
            const original_preload = window.preload;
            window.preload = (...args) => {
                if (typeof original_preload === 'function') {
                    original_preload(...args);
                }
                console.log('-> (plot) proxied preload');
                if (!window.t) { return; }
                make_plotter_client(window.t);
            };
        }
    });
}
*/

// browser bootstrap
let _browser_bootstrapped = false;
(function bootstrap_browser() {
    if (_browser_bootstrapped) { return; }
    const window = globalThis;
    if (window.tg?.default_turtle) {
        console.log(`🖨️ → Plotter Module (v${VERSION})`);
        make_plotter_client(window.tg.default_turtle);
    }
    _browser_bootstrapped = true;
})();