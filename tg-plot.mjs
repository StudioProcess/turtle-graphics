function create_ui() {
    const tmp = document.createElement('template');
    tmp.innerHTML = '<div style="font-family:system-ui; width:200px; height:100px; position:fixed; top:0; right:0;"><input class="server" placeholder="Server" value="ws://plotter-server.local:4321"></input><button class="connect">Connect</button><span class="status">○</span><br>client id: <span class="client_id"></span><br><span class="lines">0</span> lines<br><button class="clear">Clear</button> <button class="plot">Plot</button></div>';
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

export function make_plotter_client(tg_instance) {
    let lines = [];
    const original_line_fn = tg_instance.state().line_fn;
    
    const div = create_ui();
    const lines_span = div.querySelector('.lines');
    const client_id_span = div.querySelector('.client_id');
    const clear_button = div.querySelector('.clear');
    const plot_button = div.querySelector('.plot');
    const status_span = div.querySelector('.status');
    const server_input = div.querySelector('.server');
    const connect_button = div.querySelector('.connect');
    
    client_id_span.innerText = crypto.randomUUID().slice(0, 8);
    
    clear_button.onmousedown = () => {
        lines = [];
        lines_span.innerText = 0;
    };
    
    plot_button.onmousedown = () => {
        const path = to_path(lines);
        console.log(lines);
        console.log(path);
    }
    
    tg_instance.set_line_fn((...args) => {
        original_line_fn(...args);
        lines.push(args);
        lines_span.innerText = lines.length;
    });
    
    // ○●◌
    let url;
    let socket;
    
    function connect() {
        connect_button.disabled = true;
        connect_button.innerText = 'Connecting...';
        status_span.innerText = '◌';
        url = server_input.value;
        
        let timeout;
        
        function on_connect() {
            if (timeout) clearTimeout(timeout);
            status_span.innerText = '●';
            connect_button.innerText = 'Disconnect';
            connect_button.disabled = false;
        }
        
        function on_disconnect() {
            if (timeout) clearTimeout(timeout);
            status_span.innerText = '○';
            connect_button.innerText = 'Connect';
            connect_button.disabled = false;
        }
        
        try {
            socket = new WebSocket(url);
            timeout = setTimeout(() => {
                console.log('connect timeout');
                socket.close();
            }, 3000);
        
            socket.onopen = (e) => {
                console.log('open');
                on_connect();
            };
            
            socket.onclose = (e) => {
                console.log('close');
                on_disconnect();
            };
            
            socket.onerror = (e) => {
                console.log('error');
                on_disconnect();
            };
        } catch (e) {
            on_disconnect();
        }
    }

    function disconnect() {
        socket?.close();
    }
    
    connect_button.onmousedown = () => {
        if (!socket || socket?.readyState == 3) { connect(); }
        else if (socket?.readyState == 1) { disconnect(); }
    };
    
}

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