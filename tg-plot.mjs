const VERSION = 5;
const TARGET_SIZE = [420, 297]; // A3 Landscape, in mm
const SIZES = {
    'A3_LANDSCAPE': [420, 297],
    'A3_PORTRAIT' : [297, 420],
    'A4_LANDSCAPE': [297, 210],
    'A4_PORTRAIT':  [210, 297],
};
const MARGIN = 0.05; // scale down (scaling factor = 1-MARGIN)
const SERVER_URL = 'wss://plotter.eu.ngrok.io';

const CONNECT_ON_START = true;
const WAIT_BEFORE_RECONNECT = 10_000; // ms
const RETRIES = -1 // -1 for unlimited

function create_ui() {
    const tmp = document.createElement('template');
    tmp.innerHTML = `<div style="display:none; font-family:system-ui; width:200px; height:100px; position:fixed; top:0; right:0;">
    <input class="server" placeholder="Server" value=""></input><br>
    <button class="connect">Connect</button><span class="status">○</span><br>
    your id: <span class="client_id">–</span><br>
    lines: <span class="lines">–</span><br>
    travel: <span class="travel">–</span><br>
    ink: <span class="ink">–</span><br>
    plotter queue: <span class="queue_len">–</span><br>
    your job: <span class="queue_pos">–</span><br>
    format: <select class="format"><option value="A3_LANDSCAPE">A3 Landscape</option><option value="A3_PORTRAIT">A3 Portrait</option></select><br>
    speed: <input class="speed" placeholder="Drawing Speed (%)" type="number" value="100" min="50" max="100"></input><br>
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

// Fit viewbox into a target size, with margin
// Returns [sx, sy, cx, cy]
function scale_viewbox(viewbox, target_size = [420, 297], margin = 0.05) {
    const center = [ viewbox[0] + viewbox[2]/2, viewbox[1] + viewbox[3]/2 ];
    const scale_w = target_size[0] / viewbox[2];
    const scale_h = target_size[1] / viewbox[3];
    const scale = Math.min(scale_w, scale_h) * (1 - margin);
    return [ scale, scale, center[0], center[1] ];
}

// move to the center given by (cx, cy), then scale by (sx, sy)
function scale_lines(lines, sx = 1, sy = 1, cx = 0, cy = 0) {
    return lines.map( ([x0, y0, x1, y1]) => [
        sx * (x0 - cx), 
        sy * (y0 - cy), 
        sx * (x1 - cx), 
        sy * (y1 - cy) ] );
}

function scale_lines_viewbox(lines, viewbox, target_size = [420, 297]) {
    const scale_args = scale_viewbox(viewbox, target_size, MARGIN);
    return scale_lines(lines, ...scale_args);
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

function timestamp(date = undefined) {
    if (date === undefined) {
        date = new Date();
    }
    function pad(val, digits = 2) {
        return (new String(val)).padStart(digits, '0');
    }
    function tz_offset() {
        const offset = date.getTimezoneOffset() / -60;
        return (offset >= 0 ? '+' : '') + pad(offset, 1);
    }
    return `${date.getFullYear()}${pad(date.getMonth())}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}_UTC${tz_offset()}`;
}

// Returns a promise
async function hash(str) {
    const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
    const array = Array.from(new Uint8Array(buffer));
    return array.map( (b) => b.toString(16).padStart(2, '0') ).join('');
}

// TODO: stroke width
async function to_svg(lines, lines_viewbox = null, target_size=[420, 297], date = undefined) {
    if (lines_viewbox === 'bbox') { // calculate bounding box
        lines_viewbox = geb_bbox(lines);
        lines = scale_lines_viewbox(lines, lines_viewbox, target_size);
    } else if (Array.isArray(lines_viewbox)) { // viewbox given [x, y, w, h]
        lines = scale_lines_viewbox(lines, lines_viewbox, target_size);
    }
    
    const stats = line_stats(lines);
    const d = to_path(lines);
    
    const _timestamp = timestamp(date);
    
    let svg =`<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:tg="https://sketch.process.studio/turtle-graphics"
     tg:count="${stats.count}" tg:travel="${Math.trunc(stats.travel)}" tg:travel_ink="${Math.trunc(stats.travel_ink)}" tg:travel_blank="${Math.trunc(stats.travel)-Math.trunc(stats.travel_ink)}"
     width="${target_size[0]}mm"
     height="${target_size[1]}mm"
     viewBox="-${target_size[0]/2} -${target_size[1]/2} ${target_size[0]} ${target_size[1]}"
     stroke="black" fill="none" stroke-linecap="round">
    <path d="${d}" />
</svg>`;
    
    const _hash = await hash(svg); // hash without comment (contains timestamp)
    svg = `<!-- Created with tg-plot (v${VERSION}) at ${_timestamp} -->\n`
        + `<!-- SHA-1 (after this line): ${_hash} -->\n`
        + svg;
    return { svg, stats, timestamp: _timestamp, hash: _hash };
}

function make_line_stats() {
    const stats = {
        count: 0,
        travel: 0,
        travel_ink: 0,
        travel_blank: 0
    };
    let px;
    let py;
    
    function dist(x0, y0, x1, y1) {
        return Math.sqrt( (x1-x0)**2 + (y1-y0)**2 );
    }
    
    function add_line(x0, y0, x1, y1) {
        const blank = px !== undefined ? dist(px, py, x0, y0) : 0; // blank travel to line start
        const ink = dist(x0, y0, x1, y1); // line
        stats.count += 1;
        stats.travel_blank += blank;
        stats.travel_ink += ink;
        stats.travel += blank + ink;
        px = x1;
        py = y1;
    }
    
    function get() {
        return Object.assign({}, stats);
    }
    
    return { add_line, get };
}

function line_stats(lines) {
    const stats = make_line_stats();
    for (let line of lines) { stats.add_line(...line); }
    return stats.get();
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
        wait_before_reconnect: 1000,
        retries: 3, // -1 for unlimited
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
        if (state === STATE.disconnected) { start(url_); return true; }
        else { stop(); return false; }
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

function get_localstorage(key, default_value) {
    let value = localStorage.getItem(key);
    if (value === null) {
        value = default_value;
        localStorage.setItem(key, value);
    }
    return value;
}

function set_localstorage(key, value) {
    localStorage.setItem(key, value);
}

function add_fns(fns, objs) {
    for (let fn of fns) {
        if (typeof fn.name === 'string' && fn.name !== '') {
            for (let obj of objs) {
                // Use defineProperty, so p5 won't detect the change and complain
                Object.defineProperty(obj, fn.name, {
                    configurable: true,
                    enumerable: true,
                    writable: true,
                    value: fn
                });
            }
        }
    }
}


export function make_plotter_client(tg_instance) {
    let recording = true;
    let lines = []; // lines as they arrive from tg module (in px)
    let line_stats = make_line_stats(); // stats based on lines
    
    const div = create_ui();
    const lines_span = div.querySelector('.lines');
    const travel_span = div.querySelector('.travel');
    const ink_span = div.querySelector('.ink');
    const client_id_span = div.querySelector('.client_id');
    const clear_button = div.querySelector('.clear');
    const cancel_button = div.querySelector('.cancel');
    const plot_button = div.querySelector('.plot');
    const status_span = div.querySelector('.status');
    const server_input = div.querySelector('.server');
    const speed_input = div.querySelector('.speed');
    const connect_button = div.querySelector('.connect');
    const queue_pos_span = div.querySelector('.queue_pos');
    const queue_len_span = div.querySelector('.queue_len');
    const savesvg_button = div.querySelector('.savesvg');
    const format_select = div.querySelector('.format');
    
    client_id_span.innerText = get_localstorage( 'tg-plot:client_id', crypto.randomUUID().slice(0, 8) );
    server_input.value = get_localstorage( 'tg-plot:server_url', SERVER_URL );
    
    clear_button.onmousedown = () => {
        lines = [];
        line_stats = make_line_stats();
        lines_span.innerText = '–';
        travel_span.innerText = '–';
        ink_span.innerText = '–';
    };
    
    plot_button.onmousedown = async () => {
        if (lines.length == 0) { return; }
        const format = format_select.value;
        const size = SIZES[format]; // target size in mm
        const { svg, timestamp, stats, hash } = await to_svg(lines, tg_instance._p5_viewbox, size);
        let speed = parseInt(speed_input.value);
        if (isNaN(speed)) { speed = 100; }
        const msg = JSON.stringify({
            type: 'plot',
            client: client_id_span.innerText,
            id: crypto.randomUUID(),
            svg,
            stats,
            timestamp,
            hash,
            speed,
            format,
            size,
        });
        console.log(msg);
        ac.send(msg);
    };
    
    cancel_button.onmousedown = () => {
        const msg = JSON.stringify({
            type: 'cancel',
            client: client_id_span.innerText,
        });
        console.log(msg);
        ac.send(msg);
    };
    
    savesvg_button.onmousedown = async () => {
        if (lines.length == 0) { return; }
        const size = SIZES[format_select.value]; // target size in mm
        const { svg, timestamp, stats, hash } = await to_svg(lines, tg_instance._p5_viewbox, size);
        save_text(svg, `${timestamp}_${hash.slice(0,5)}.svg`);
    };
    
    
    function update_stats() {
        const stats = line_stats.get();
        // scaling factor
        // TODO: tg_instance._p5_viewbox should actually never be undefined
        const scale = tg_instance._p5_viewbox ? 
            scale_viewbox(tg_instance._p5_viewbox, SIZES[format_select.value], MARGIN)[0] : 
            1.0;
        const unit = tg_instance._p5_viewbox ? ' mm' : ' px';
        lines_span.innerText = stats.count;
        travel_span.innerText = Math.floor(stats.travel * scale) + unit;
        ink_span.innerText = Math.floor(stats.travel_ink * scale) + unit;
    }
    
    format_select.onchange = () => {
        update_stats();
    };
    
    tg_instance._add_line_fn((...line) => {
        if (!recording) { return; }
        lines.push(line);
        line_stats.add_line(...line);
        update_stats();
    });
    
    function resetplot() {
        lines = [];
        line_stats = make_line_stats();
        lines_span.innerText = '–';
        travel_span.innerText = '–';
        ink_span.innerText = '–';
    }
    
    function recordplot(recording_ = true) {
        if (recording_) { recording = true; }
        else { recording = false; }
    }
    
    function pauseplot() {
        recordplot(false);
    }
    
    function isrecordingplot() {
        return recording();
    }
    
    function plot() {
        recording = false; // recordplot(false)
        show_ui();         // showplot()
    }
    
    function showplotmenu() {
        show_ui();
    }
    
    function hideplotmenu() {
        div.style.display = 'none';
    }
    
    add_fns([resetplot, recordplot, pauseplot, isrecordingplot, plot, showplotmenu, hideplotmenu], [tg_instance, window]);
    
    const ac = autoconnect({
        wait_before_reconnect: WAIT_BEFORE_RECONNECT,
        retries: RETRIES,
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
        const connecting = ac.toggle(server_input.value);
        if (connecting) {
            // connecting
            set_localstorage( 'tg-plot:server_url', server_input.value );
            set_localstorage( 'tg-plot:connect_on_start', 1 );
        } else {
            // disconnecting
            set_localstorage( 'tg-plot:connect_on_start', 0 );
        }
    };
    
    function show_ui() {
        if (div.style.display !== 'none') { return; }
        const connect_on_start = get_localstorage( 'tg-plot:connect_on_start', CONNECT_ON_START );
        if (connect_on_start != '0') { 
            ac.start(server_input.value); 
        }
        div.style.display = 'block';
    }
    
    const url = new URL(import.meta.url);
    const do_show = url.searchParams.get('show') !== null;
    if (do_show) {
        show_ui();
    }
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