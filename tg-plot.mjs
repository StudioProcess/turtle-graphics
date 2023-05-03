const VERSION = '___VERSION___';
const GLOBAL_INSTANCE_NAME = 'p';
const PLOTTER_FUNCTION_NAME = 'plotter';
const HOTKEYS = [ ['metaKey', 'altKey', 'KeyP'], ['ctrlKey', 'altKey', 'KeyP'] ]; // Hotkeys to open plot menu (Cmd/Ctrl + Alt + P)

const SVG_PRECISION = 3; // Number of decimal places (Avoid precision errors, that produce discontinuities in the SVG) (-1 to deactivate limiting)
const SVG_CLIPPING = true; // Perform clipping to scaled viewbox (NOT target viewbox)
const SVG_MIN_LINE_LENGTH = 1/10; // Minimum length of a line in mm (Hopefully avoids belt slipping) (0 to deactivate filtering)
const TARGET_SIZE = [420, 297]; // A3 Landscape, in mm
const SIZES = {
    'A3 Landscape': [420, 297],
    'A3 Portrait' : [297, 420],
    'A4 Landscape': [297, 210],
    'A4 Portrait':  [210, 297],
};
const MARGIN = 0.05; // scale down (scaling factor = 1-MARGIN)
// const SERVER_URL = 'wss://plotter.process.tools';
const SERVER_URL = 'wss://plotter.eu.ngrok.io';

const CONNECT_ON_START = true;
const WAIT_BEFORE_RECONNECT = 10_000; // ms
const RETRIES = -1 // -1 for unlimited

function create_ui() {
    const tmp = document.createElement('template');
    const format_options = Object.keys(SIZES).reduce( (acc, key) => acc += `<option value="${key}">${key}</option>`, '' ) ;
    tmp.innerHTML = `<div id="plotter-ui" style="display:none; font:11px system-ui; width:200px; position:fixed; top:0; right:0; padding:8px; background:rgba(255,255,255,0.66)">
    <div style="font-weight:bold; text-align:center; position:relative;">Plotter<span class="close-button" style="display:inline-block; position:absolute; right:0; cursor:pointer;">✕</span></div>
    <input class="server" placeholder="Server" value=""></input><br>
    <button class="connect" style="margin:5px 5px auto auto;">Connect</button><span class="status">○</span><br>
    <hr>
    <table>
    <style>td:first-child {text-align:right;} input:invalid { outline:2px solid red; }</style>
    <tr> <td>Your ID:</td> <td><input type="text" class="client_id" style="font-weight:bold;" required size=
    12" maxlength="10" min="3" pattern="\\w{3,10}"></input></td> </tr>
    <tr> <td>Lines:</td> <td><span class="lines">–</span></td> </tr>
    <tr> <td>Out of bounds:</td> <td><span class="oob">–</span></td> </tr>
    <tr> <td>Short:</td> <td><span class="short">–</span></td> </tr>
    <tr> <td>Travel:</td> <td><span class="travel">–</span></td> </tr>
    <tr> <td>Ink:</td> <td><span class="ink">–</span></td> </tr>
    <tr> <td>Format:</td> <td><select class="format">${format_options}</select></td> </tr>
    <tr> <td>Speed:</td> <td><input class="speed" placeholder="Drawing Speed (%)" type="number" value="100" min="10" max="100"></input></td> </tr>
    <tr> <td>Plotter queue:</td> <td><span class="queue_len">–</span></td> </tr>
    <tr> <td>Your job:</td> <td><span class="queue_pos">–</span></td> </tr>
    <table>
    <hr>
    <div style="text-align:center";><button class="preview" style="width:80px; margin-right:5px; margin-bottom:0;">Preview</button><button class="savesvg" style="width:80px; margin-bottom:0;">Save SVG</button></div>
    <div style="text-align:center";><!-- <button class="clear">Clear</button> --> <button class="plot" style="width:165px; height:28px; margin-top:5px;" disabled>Plot</button> <!-- <button class="cancel" disabled>Cancel</button></div> -->
    </div> `;
    const div = tmp.content.firstChild;
    document.body.appendChild(div);
    return div;
}

function random_id(len = 10, base = 16, offset = 10) {
    let id = '';
    for (let i=0; i<len; i++) {
        id += (offset + Math.floor(Math.random() * base)).toString(offset+base);
    }
    return id;
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
function scale_args_viewbox(viewbox, target_size = [420, 297], margin = 0.05) {
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

// scale lines from viewbox to target size, with margin
function scale_lines_viewbox(lines, viewbox, target_size, margin) {
    const scale_args = scale_args_viewbox(viewbox, target_size, MARGIN);
    return scale_lines(lines, ...scale_args);
}

// scale viewbox to target size, with margin
// uses scale_lines_viewbox, by treating the viewbox as a line [xmin, ymin, xmax, ymax]
function scale_viewbox(viewbox, target_size, margin) {
    let line = [viewbox[0], viewbox[1], viewbox[0] + viewbox[2], viewbox[1] + viewbox[3]]; // viewbox to line (diagonal)
    line = scale_lines_viewbox([line], viewbox, target_size, margin)[0]; // scaled line
    return [ line[0], line[1], line[2]-line[0], line[3]-line[1] ]; // back to viewbox [x, y, w, h]
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

function round(num, precision) {
    const n = 10 ** precision;
    return Math.round((num + Number.EPSILON) * n) / n;
}

function limit_precision(x) {
    if (SVG_PRECISION < 0 || Number.isInteger(x)) { return x; }
    return round(x, SVG_PRECISION);
}

// Returns a promise
async function hash(str) {
    const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
    const array = Array.from(new Uint8Array(buffer));
    return array.map( (b) => b.toString(16).padStart(2, '0') ).join('');
}

function debounce(fn, delay=1000) {
    let blocked = false;
    return function(...args) {
        if (!blocked) {
            blocked = true;
            setTimeout(() => {
                fn(...args);
                blocked = false;
            }, delay);
        }
    };
}

function format_num(number) {
    return new Intl.NumberFormat('en-US').format(number);
}

// https://en.wikipedia.org/wiki/Cohen–Sutherland_algorithm
// Returns clipped line or false if line was completely removed
function clip_line( [x0, y0, x1, y1], [xmin, ymin, xmax, ymax] ) {
    const INSIDE = 0; // 0000
    const LEFT = 1;   // 0001
    const RIGHT = 2;  // 0010
    const BOTTOM = 4; // 0100
    const TOP = 8;    // 1000
    
    function out_code(x, y) {
        let code = INSIDE;  // initialised as being inside of clip window
        if (x < xmin) { code |= LEFT; }          // to the left of clip window
        else if (x > xmax) { code |= RIGHT; }     // to the right of clip window
        if (y < ymin) { code |= BOTTOM; }          // below the clip window
        else if (y > ymax) { code |= TOP; }     // above the clip window
        return code;
    }
    
    let outcode0 = out_code(x0, y0);
    let outcode1 = out_code(x1, y1);
    let accept = false; // Note: unused
    
    while (true) {
        if (!(outcode0 | outcode1)) {
            // bitwise OR is 0: both points inside window; trivially accept and exit loop
            accept = true;
            break;
        } else if (outcode0 & outcode1) {
            // bitwise AND is not 0: both points share an outside zone (LEFT, RIGHT, TOP,
            // or BOTTOM), so both must be outside window; exit loop (accept is false)
            break;
        } else {
            // failed both tests, so calculate the line segment to clip
            // from an outside point to an intersection with clip edge
            let x, y;
            // At least one endpoint is outside the clip rectangle; pick it.
            let outcodeOut = outcode1 > outcode0 ? outcode1 : outcode0;
            // Now find the intersection point;
            if (outcodeOut & TOP) {           // point is above the clip window
                x = x0 + (x1 - x0) * (ymax - y0) / (y1 - y0);
                y = ymax;
            } else if (outcodeOut & BOTTOM) { // point is below the clip window
                x = x0 + (x1 - x0) * (ymin - y0) / (y1 - y0);
                y = ymin;
            } else if (outcodeOut & RIGHT) {  // point is to the right of clip window
                y = y0 + (y1 - y0) * (xmax - x0) / (x1 - x0);
                x = xmax;
            } else if (outcodeOut & LEFT) {   // point is to the left of clip window
                y = y0 + (y1 - y0) * (xmin - x0) / (x1 - x0);
                x = xmin;
            }
            // Now we move outside point to intersection point to clip
            // and get ready for next pass.
            if (outcodeOut == outcode0) {
                x0 = x;
                y0 = y;
                outcode0 = out_code(x0, y0);
            } else {
                x1 = x;
                y1 = y;
                outcode1 = out_code(x1, y1);
            }
        }
    }
    return accept ? [x0, y0, x1, y1] : false;
}

function clip_lines(lines, bounds) {
    lines = lines.map(line => clip_line(line, bounds));
    // filter out removed lines
    lines = lines.filter(line => line !== false);
    return lines;
}

function filter_short_lines(lines, min_len) {    
    function len(x0, y0, x1, y1) {
        return Math.sqrt( (x1-x0)**2 + (y1-y0)**2 );
    }
    
    let out = [];   // output lines
    let sx, sy;     // start: start of next line for output
    let ex, ey;     //   end: always end of last encountered line
    let cumlen = 0; // cumulative length, starting from (sx,sy)
    let skipped_segments = 0; // counter for stats (unused)
    
    for (let line of lines) {
        const l = len(...line); // length of current segment
        const [x0, y0, x1, y1] = line;
        
        if (x0 !== ex || y0 !== ey) { // staring point is different from last ending point
            // start of new linestrip
            sx = x0; // set start point for next output
            sy = y0;
            cumlen = 0; // reset length
        }
        
        cumlen += l; // add curent segment length
        ex = x1; // always set end point
        ey = y1;
        
        if (cumlen >= min_len) {
            out.push([ sx, sy, ex, ey ]);
            sx = x1;
            sy = y1;
            cumlen = 0;
        } else {
            skipped_segments += 1;
        }
    }
    return out;
}

// TODO: stroke width
async function to_svg(lines, lines_viewbox = null, target_size=[420, 297], date = undefined) {
    if (lines_viewbox === 'bbox') { // calculate bounding box
        lines_viewbox = geb_bbox(lines);
        lines = scale_lines_viewbox(lines, lines_viewbox, target_size, MARGIN);
    } else if (Array.isArray(lines_viewbox)) { // viewbox given [x, y, w, h]
        lines = scale_lines_viewbox(lines, lines_viewbox, target_size, MARGIN);
    }
    
    lines = lines.map(line => line.map(limit_precision));
    
    if (SVG_CLIPPING) {
        const scaled_vb = scale_viewbox(lines_viewbox, target_size, MARGIN); // original viewbox scaled up to target size
        let bounds = [ scaled_vb[0], scaled_vb[1], scaled_vb[0] + scaled_vb[2], scaled_vb[1] + scaled_vb[3] ];
        bounds = bounds.map(limit_precision);
        lines = clip_lines(lines, bounds);
    }
    
    if (SVG_MIN_LINE_LENGTH > 0) {
        lines = filter_short_lines(lines, SVG_MIN_LINE_LENGTH);
    }
    
    const stats = line_stats(lines); // No need to provide viewbox (out of bounds were clipped already) or scale (lines are already scaled, short lines removed)
    const _timestamp = timestamp(date);
    const d = to_path(lines);
    
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

function svg_data_url(svg) {
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

// viewbox: (Optional) For out-of-bounds counting
// scale:   (Optional) For scaled travels and short_count
function make_line_stats(viewbox = undefined, scale = undefined) {
    const empty = {
        count: 0,
        oob_count: 0, // out of bounds lines
        short_count: 0, // lines shorter than SVG_MIN_LINE_LENGTH
        travel: 0,
        travel_ink: 0,
        travel_blank: 0
    };
    const stats = Object.assign({}, empty);
    let px;
    let py;
    const lines = [];
    
    function dist(x0, y0, x1, y1) {
        return Math.sqrt( (x1-x0)**2 + (y1-y0)**2 );
    }
    
    function point_out_of_bounds(x, y) {
        const left = viewbox[0], top = viewbox[1], right = left + viewbox[2], bottom = top + viewbox[3];
        return x < left || x > right || y < top || y > bottom;
    }
    
    function add_line(x0, y0, x1, y1, save = true) {
        if (save) { 
            lines.push([x0, y0, x1, y1]); // Save lines for possible recomputation when viewbox or scale change
        }
        let blank = px !== undefined ? dist(px, py, x0, y0) : 0; // blank travel to line start
        let ink = dist(x0, y0, x1, y1); // line
        if (scale !== undefined) {
            blank *= scale;
            ink *= scale;
        }
        stats.count += 1;
        stats.travel_blank += blank;
        stats.travel_ink += ink;
        stats.travel += blank + ink;
        px = x1;
        py = y1;
        if (viewbox !== undefined) {
            if (point_out_of_bounds(x0, y0) || point_out_of_bounds(x1, y1)) { stats.oob_count += 1; }
        }
        if (scale !== undefined) {
            if (ink < SVG_MIN_LINE_LENGTH) { stats.short_count += 1; }
        }
    }
    
    function get() {
        return Object.assign({}, stats);
    }
    
    let viewbox_changed = false;
    function set_viewbox(new_viewbox) {
        viewbox_changed = true;
        if (JSON.stringify(new_viewbox) === JSON.stringify(viewbox)) {
            viewbox_changed = false; 
        }
        viewbox = new_viewbox;
    }
    
    let scale_changed = false;
    function set_scale(new_scale) {
        scale_changed = true;
        if (scale === new_scale || (scale === undefined && new_scale === 1)) {
            scale_changed = false;
        }
        scale = new_scale;
    }
    
    // Recompute stats, only if viewbox or scale were changed
    function update() {
        if (viewbox_changed || scale_changed) {
            Object.assign(stats, empty);
            for (let line of lines) { add_line(...line, false); } // Don't save those lines again!
            viewbox_changed = false;
            scale_changed = false;
        }
        return get();
    }
    
    return { add_line, get, update, set_viewbox, set_scale };
}

function line_stats(lines, viewbox = undefined, scale = undefined) {
    const stats = make_line_stats(viewbox, scale);
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
        on_error: undefined,
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
            callback(options.on_disconnected, e);
        } else {
            if (state === STATE.connected) { retries = 0; }
            state = STATE.disconnected;
            if ( e?.code && ![1000, 1001].includes(e.code) ) {
                callback(options.on_error, e);
            }
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
    
    function state_() {
        return state;
    }
    
    function send(data) {
        if (socket && socket.readyState === 1) { // OPEN
            socket.send(data);
        }
    }
    
    return { start, stop, toggle, send, socket:socket_, state:state_, STATE };
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

function checkHotkey(hotkey, e) {
    const hotkey_mods = hotkey.slice(0, -1); // all execpt last are modifiers
    hotkey = hotkey.at(-1); // last element is the actual key
    if (e.code !== hotkey) { return false; } // comparing to event.code i.e. "KeyP"
    
    let modifiers = { altGraphKey:false, altKey:false, ctrlKey:false, metaKey:false, shiftKey:false };
    for (let m of hotkey_mods) { modifiers[m] = true; }
    for (let [m, val] of Object.entries(modifiers)) {
        if (e[m] !== val) { return false; }
    }
    return true;
}

function checkHotkeys(hotkeys, e) {
    for (let h of hotkeys) {
        if ( checkHotkey(h, e) ) {
            return true;
        } 
    }
    return false;
}



export function make_plotter_client(tg_instance) {
    let recording = true;
    let lines = []; // lines as they arrive from tg module (in px)
    let line_stats = make_line_stats(); // Can't immediately initialize with tg_instance._p5_viewbox (not yet available) -> Init via line_fn callbacks 
    let line_stats_viewbox_initialized = false;
    let plotting = false;
    
    const div = create_ui();
    const lines_span = div.querySelector('.lines');
    const oob_span = div.querySelector('.oob');
    const short_span = div.querySelector('.short');
    const travel_span = div.querySelector('.travel');
    const ink_span = div.querySelector('.ink');
    const client_id_input = div.querySelector('.client_id');
    // const clear_button = div.querySelector('.clear');
    // const cancel_button = div.querySelector('.cancel');
    const plot_button = div.querySelector('.plot');
    const status_span = div.querySelector('.status');
    const server_input = div.querySelector('.server');
    const speed_input = div.querySelector('.speed');
    const connect_button = div.querySelector('.connect');
    const queue_pos_span = div.querySelector('.queue_pos');
    const queue_len_span = div.querySelector('.queue_len');
    const preview_button = div.querySelector('.preview');
    const savesvg_button = div.querySelector('.savesvg');
    const format_select = div.querySelector('.format');
    const close_button = div.querySelector('.close-button');
    
    server_input.value = get_localstorage( 'tg-plot:server_url', SERVER_URL );
    client_id_input.value = get_localstorage( 'tg-plot:client_id', random_id(4, 26, 10).toUpperCase() );
    format_select.value = get_localstorage( 'tg-plot:format', 'A3 Landscape' );
    speed_input.value = get_localstorage( 'tg-plot:speed', 100 );
    
    close_button.onmousedown = (e) => {
        if (e.button !== 0) { return; } // left mouse button only
        hide_ui();
    };
    
    client_id_input.onkeydown = (e) => {
        if (e.key == 'Enter') { e.target.blur(); }
    };
    
    client_id_input.onblur = (e) => {
        const valid = e.target.reportValidity();
        if (valid) {
            set_localstorage('tg-plot:client_id', e.target.value );
        }
        if (ac.state() === ac.STATE.connected) { 
            plot_button.disabled = !valid; 
        }
    };
    
    plot_button.onmouseup = async (e) => { // use mouseup, since this comes after blur
        if (e.button !== 0) { return; } // left mouse button only
        if (!plotting) { // Plot
            if (lines.length == 0) { return; }
            const format = format_select.value;
            const size = SIZES[format]; // target size in mm
            const { svg, timestamp, stats, hash } = await to_svg(lines, tg_instance._p5_viewbox, size);
            let speed = parseInt(speed_input.value);
            if (isNaN(speed)) { speed = 100; }
            const msg = JSON.stringify({
                type: 'plot',
                client: client_id_input.value,
                id: random_id(),
                svg,
                stats,
                timestamp,
                hash,
                speed,
                format,
                size,
            });
            // console.log(msg);
            ac.send(msg);
        } else { // Cancel
            const msg = JSON.stringify({
                type: 'cancel',
                client: client_id_input.value,
            });
            // console.log(msg);
            ac.send(msg);
        }
    };
    
    preview_button.onmousedown = async (e) => {
        if (e.button !== 0) { return; } // left mouse button only
        if (lines.length == 0) { return; }
        const size = SIZES[format_select.value]; // target size in mm
        const { svg, timestamp, stats, hash } = await to_svg(lines, tg_instance._p5_viewbox, size);
        const url = svg_data_url(svg);
        const filename = `${timestamp}_${hash.slice(0,5)}.svg`;
        const format_name = format_select.querySelector('option:checked').innerText;
        
        const w = window.open('about:blank');
        if (!w) {
            console.warn(`🖨️ → Preview window was blocked. Please allow the pop-up in your browser and try again!`);
            return;
        }
        w.document.write(`<html><head><title>${filename}</title></head><body style="padding:0; margin:0; font:10px system-ui; color:dimgray; background:lightgray; display:flex; flex-direction:column; align-items:center; justify-content:center;"><div><img src="${url}" style="background:white; max-width:90vw; max-height:80vh; box-shadow:3px 3px 10px 1px gray;" /><div style="margin-top:2em;">${filename}<br>${format_num(stats.count)} lines<br>${format_num(Math.floor(stats.travel_ink))} / ${format_num(Math.floor(stats.travel))} mm<br>${format_name} (${size[0]} ✕ ${size[1]} mm)<br><a href="${url}" download="${filename}" style="color:dimgray;">Download</a></div></div></body></html>`);
    };
    
    savesvg_button.onmousedown = async (e) => {
        if (e.button !== 0) { return; } // left mouse button only
        if (lines.length == 0) { return; }
        const size = SIZES[format_select.value]; // target size in mm
        const { svg, timestamp, stats, hash } = await to_svg(lines, tg_instance._p5_viewbox, size);
        save_text(svg, `${timestamp}_${hash.slice(0,5)}.svg`);
    };
    
    // Scale factor to proportionally scale the viewbox to the selected format, with margin
    function scale_factor() {
        return tg_instance._p5_viewbox ? 
        scale_args_viewbox(tg_instance._p5_viewbox, SIZES[format_select.value], MARGIN)[0] : 
        1.0;
    }
    
    function update_stats() {
        line_stats.set_viewbox(tg_instance._p5_viewbox);
        line_stats.set_scale(scale_factor());
        const stats = line_stats.update(); // update stats, if viewbox or scale is different
        const unit = tg_instance._p5_viewbox ? ' mm' : ' px';
        
        lines_span.innerText = format_num(stats.count);
        oob_span.innerText = format_num(stats.oob_count);
        oob_span.style.color = stats.oob_count > 0 ? 'red' : '';
        short_span.innerText = format_num(stats.short_count);
        short_span.style.color = stats.short_count > 0 ? 'red' : '';
        travel_span.innerText = format_num(Math.floor(stats.travel)) + unit;
        ink_span.innerText = format_num(Math.floor(stats.travel_ink)) + unit;
    }
    const update_stats_debounced = debounce(update_stats, 1000);
    
    format_select.onchange = (e) => {
        update_stats();
        set_localstorage( 'tg-plot:format', e.target.value );
    };
    
    speed_input.onchange = (e) => {
        if (e.target.checkValidity()) {
            set_localstorage( 'tg-plot:speed', e.target.value );
        }
    };
    
    tg_instance._add_line_fn((...line) => {
        if (! line_stats_viewbox_initialized) {
            line_stats.set_viewbox(tg_instance?._p5_viewbox);
            line_stats.set_scale(scale_factor());
            line_stats_viewbox_initialized = true;
        }
        if (!recording) { return; }
        line = line.map(limit_precision);
        lines.push(line);
        line_stats.add_line(...line);
        update_stats_debounced();
    });
    
     
     /**
      * An object containing a bunch of functions to control plotting your turtle graphics.
      * <br>
      * Retrieved with {@link plotter}.
      * 
      * @typedef {Object} Plotter
      * @property {function} plot - Stop recording lines and show to plotter UI.
      * @property {function} stop - Stop recording lines. Can be used to exclude a part of your drawing from being plotted.
      * @property {function} record - Start recording lines. Recording is enabled from the start, so this function is only useful if <code>stop</code> was used before.
      * @property {function} clear - Clear all recorded lines. Doesn't change if recording is enabled or not.
      * @property {function} isrecording - Returns <code>true</code> if lines are being recorded, <code>false</code> otherwise.
      * @property {function} show - Show the plotter UI.
      * @property {function} hide - Hide the plotter UI.
      * @property {function} isshown - Returns <code>true</code> if the plotter UI is visible, <code>false</code> otherwise.
      * @property {function} lines - (Advanced) Returns an array of all recorded lines so far.
      * @property {function} stats - (Advanced) Returns an object containing statistics for the recorded lines so far.
      */
    const public_fns = {
        clear() {
            lines = [];
            line_stats = make_line_stats(tg_instance?._p5_viewbox, scale_factor());
            lines_span.innerText = '–';
            travel_span.innerText = '–';
            ink_span.innerText = '–';
        },
        
        record(recording_ = true) {
            if (recording_) { recording = true; }
            else { recording = false; }
        },
        
        stop()  {
            recording = false;
        },
            
        isrecording() {
            return recording;
        },
        
        plot() {
            recording = false;
            show_ui();        
        },
        
        show() {
            show_ui();
        },
        
        hide() {
            hide_ui();
        },
        
        isshown() {
            return div.style.display !== 'none';
        },
        
        lines()  {
            return structuredClone(lines);
        },
        
        stats() {
            return line_stats.get();
        }
    };
    
    const ac = autoconnect({
        wait_before_reconnect: WAIT_BEFORE_RECONNECT,
        retries: RETRIES,
        on_connecting: (retries) => {
            // console.log('on_connecting');
            connect_button.innerText = 'Stop';
            status_span.innerText = `○ Connecting${retries > 0 ? ' (' + retries +')' : ''}...`;
            queue_pos_span.innerText = '–';
            queue_len_span.innerText = '–';
            server_input.disabled = true;
            client_id_input.disabled = false;
            format_select.disabled = false;
            speed_input.disabled = false;
            plot_button.disabled = true;
            plot_button.innerText = 'Plot';
        },
        on_waiting: (retries) => {
            // console.log('on_waiting');
            status_span.innerText = `○ Waiting${retries > 0 ? ' (' + retries +')' : ''}...`;
            server_input.disabled = true;
            client_id_input.disabled = false;
            format_select.disabled = false;
            speed_input.disabled = false;
            plot_button.disabled = true;
            plot_button.innerText = 'Plot';
        },
        on_connected: (socket) => {
            // console.log('on_connected');
            connect_button.innerText = 'Disconnect';
            status_span.innerHTML = '<span style="color:dodgerblue;">●</span> Connected';
            server_input.disabled = true;
            client_id_input.disabled = false;
            format_select.disabled = false;
            speed_input.disabled = false;
            if (client_id_input.checkValidity()) { plot_button.disabled = false; }
            plot_button.innerText = 'Plot';
            plotting = false;
        },
        on_disconnected: (e) => {
            // console.log('on_disconnected');
            connect_button.innerText = 'Connect';
            status_span.innerText = '○ Disconnected';
            queue_pos_span.innerText = '–';
            queue_len_span.innerText = '–';
            server_input.disabled = false;
            client_id_input.disabled = false;
            format_select.disabled = false;
            speed_input.disabled = false;
            plot_button.disabled = true;
            plot_button.innerText = 'Plot';
        },
        on_message: (e) => {
            const msg = JSON.parse(e.data)
            // console.log('on_message', msg);
            if (msg.type === 'error') {
                console.warn(`🖨️ Plotter says: "${msg.msg}"`);
            }
            else if (msg.type === 'queue_length') {
                queue_len_span.innerText = msg.length;
            }
            else if (msg.type === 'queue_position') {
                let pos;
                if (msg.position === 0) {
                    pos = '🖨️📝 Ready to draw, load paper and pen! ';
                    plot_button.disabled = true;
                }
                else if (msg.position === -1) {
                    pos = '🖨️ Drawing...';
                    plot_button.disabled = true;
                }
                else { 
                    pos = "⌛ " + msg.position + " before you...";
                    plot_button.disabled = false;
                }
                plotting = true;
                queue_pos_span.innerText = pos;
                client_id_input.disabled = true;
                format_select.disabled = true;
                speed_input.disabled = true;
                plot_button.innerText = 'Cancel';
            }
            else if (msg.type === 'job_done') {
                plotting = false;
                queue_pos_span.innerText = '✅ Done';
                client_id_input.disabled = false;
                format_select.disabled = false;
                speed_input.disabled = false;
                plot_button.innerText = 'Plot';
                plot_button.disabled = false;
            }
            else if (msg.type === 'job_canceled') {
                plotting = false;
                queue_pos_span.innerText = '❌ Canceled';
                client_id_input.disabled = false;
                format_select.disabled = false;
                speed_input.disabled = false;
                plot_button.innerText = 'Plot';
                plot_button.disabled = false;
            }
        },
        on_error: (e) => {
            console.error(`🖨️ Plotter says: "(${e.code}) ${e.reason || 'No reason'} (${e.type ?? 'No type'})"`);
        },
    });
    
    connect_button.onmousedown = (e) => {
        if (e.button !== 0) { return; } // left mouse button only
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
    
    function hide_ui() {
        div.style.display = 'none';
    }
    
    // immediately show UI if "show" query param is set
    function check_boolean_attr(attr) {
        return attr !== null && attr !== "0" && attr.toLowerCase() !== 'false' && attr.toLowerCase() !== 'no';
    }
    const url = new URL(import.meta.url);
    const do_show = check_boolean_attr( url.searchParams.get('show') );
    if (do_show) { show_ui(); }
    
    return public_fns;
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
        console.log(`🖨️ Plotter Module (v${VERSION})`);
        
        const plotter = make_plotter_client(window.tg.default_turtle);
        
        // put plotter instance into global scope
        if (window[GLOBAL_INSTANCE_NAME] === undefined) {
            window[GLOBAL_INSTANCE_NAME] = plotter;
            console.log(`🖨️ → Global plotter: ${GLOBAL_INSTANCE_NAME}`);
        }
        
        // put plotter function on tg default intance
        /**
          * Get the {@link Plotter} object, containing all the functions to control plotting your turtle graphics.
          * 
          * @function plotter
          * @returns The {@link Plotter} object.
          */
        const plotter_fn = () => plotter;
        if (window.tg.default_turtle[PLOTTER_FUNCTION_NAME] === undefined) {
            window.tg.default_turtle[PLOTTER_FUNCTION_NAME] = plotter_fn;
            console.log(`🖨️ → Plotter function (added to turtles): ${PLOTTER_FUNCTION_NAME}`);
        }
        
        // Note: No need to add plotter_fn to global scope.
        // Since it's on the default instance, it will be globalized by it
        
        
        // Add hotkeys
        window.addEventListener('keydown', (e) => {
            if ( checkHotkeys(HOTKEYS, e) ) {
                if (plotter.isshown()) { plotter.hide(); }
                else { plotter.show(); }
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }
    _browser_bootstrapped = true;
})();