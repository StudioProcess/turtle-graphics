const VERSION = 1;

function create_ui() {
    const tmp = document.createElement('template');
    tmp.innerHTML = '<div style="font-family:system-ui; width:200px; height:100px; position:fixed; top:0; right:0;"><input class="server" placeholder="Server" value="ws://plotter-server.local:4321"></input><br><button class="connect">Connect</button><span class="status">○</span><br>client id: <span class="client_id"></span><br><span class="lines">0</span> lines<br><button class="clear">Clear</button> <button class="plot">Plot</button></div>';
    const div = tmp.content.firstChild;
    document.body.appendChild(div);
    return div;
}

function to_path(lines, num_decimals = 2) {
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
    const plot_button = div.querySelector('.plot');
    const status_span = div.querySelector('.status');
    const server_input = div.querySelector('.server');
    const connect_button = div.querySelector('.connect');
    
    client_id_span.innerText = get_client_id();
    
    clear_button.onmousedown = () => {
        lines = [];
        lines_span.innerText = 0;
    };
    
    plot_button.onmousedown = () => {
        const msg = JSON.stringify({
            type: 'plot',
            client: client_id_span.innerText,
            id: crypto.randomUUID(),
            lines
        });
        console.log(msg);
        ac.send(msg);
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
        },
        on_message: (e) => {
           console.log('on_message', e);
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