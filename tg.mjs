// TODO: coordinate system orientation
import { vec2, mat3 } from 'gl-matrix';
const EPSILON = 1e-10;
const DEFAULT_FORWARD = 100;
const DEFAULT_RIGHT = 90;
const GLOBAL_LIB_NAME = 'tg';
const GLOBAL_INSTANCE_NAME = 't';
const GLOBAL_OVERWRITTEN_NAME = 'p5';
const DONT_GLOBALIZE = [ 'VERSION', 'init' ];
const VERSION = 1;

// Constructor function
export function make_turtle_graphics(...line_fns_) {
    function _make_turtle_state() {
        return {
            x:   0,    // position (x)
            y:   0,    // position (y)
            px:  0,    // previous position (x)
            py:  0,    // previous position (y)
            a:   0,    // angle (in degrees)
            
            // untransformed state
            ux:  0,
            uy:  0,
            upx: 0,
            upy: 0,
            ua:  0,
            
            d:   true, // pen down status
        };
    }
    
    let turtle = _make_turtle_state(); // turtle state
    let turtle_stack  = [];            // turtle stack
    
    let matrix = mat3.create();        // transformation matrix
    let matrix_stack  = [];            // matrix stack
    
    let line_fns = [...line_fns_];     // line drawing callbacks
    
    /**
     * Create a new turtle instance.
     * 
     * @function maketurtle
     */
    function maketurtle(...line_fns_) {
        return make_turtle_graphics(
            ...(line_fns_.length > 0 ? line_fns_ : line_fns)
        );
    }
    
    /**
     * Get turtle instance itself.
     * 
     * @function self
     */
    function self_() {
        return self;
    }
    
    /**
     * Get a copy of the turtle instance.
     * 
     * @function clone
     */
     // TODO: better have whole internal state as an object, to avoid copying mess.
    function clone() {
        const newturtle = maketurtle(); // sets same line_fn
        Object.assign( newturtle.state().turtle, turtle ); // set turtle state
        newturtle.state().turtle_stack.splice( 0, 0, ...turtle_stack.map(t => Object.assign({}, t)) ); // insert copies of stacked states
        mat3.copy( newturtle.state().matrix, matrix ); // copy matrix values
        newturtle.state().matrix_stack.splice( 0, 0, ...matrix_stack.map(m => mat3.clone(m)) ); // insert copies of stacked matrices
        return newturtle;
    }
    
    function _draw() {
        if (!turtle.d) { return; } // don't draw if pen isn't down
        for (let line_fn of line_fns) {
            if (typeof line_fn === 'function') {
                line_fn(turtle.px, turtle.py, turtle.x, turtle.y);
            }
        }
    }
    
    // 50.000000000000014 -> 50
    function _clean_zero(v) {
        if (Math.abs(v % 1) < EPSILON) {
            return Math.trunc(v);
        } else {
            return v;
        }
    }
    
    function _clean_angle(a) {
        a = a % 360;
        if (a < 0) { a += 360; }
        return a;
    }
    
    // transform point by matrix (defaults to current matrix)
    function _transform([x, y], m = undefined) {
        const p = [ x, y ];
        m = m ?? matrix; // use current matrix by default
        vec2.transformMat3(p, p, m); // Apply given transformation
        p[0] = _clean_zero(p[0]);
        p[1] = _clean_zero(p[1]);
        return p;
    }
    
    /**
     * Move turtle forward.
     * 
     * @function forward
     */
    function forward(units = DEFAULT_FORWARD) {
        // save previous position
        turtle.upx = turtle.ux;
        turtle.upy = turtle.uy;
        turtle.px  = turtle.x;
        turtle.py  = turtle.y;
        
        // new position (untransformed)
        const angle_rad = ( turtle.ua - 90 ) / 180 * Math.PI;
        turtle.ux += units * Math.cos(angle_rad);
        turtle.uy += units * Math.sin(angle_rad);
        
        // transformed position
        [ turtle.x, turtle.y ] = _transform( [turtle.ux, turtle.uy], matrix );
        [ turtle.px, turtle.py ] = _transform( [turtle.upx, turtle.upy], matrix );
        _draw();
    }
    
    /**
     * Move turtle back.
     * 
     * @function back
     */
    function back(units = DEFAULT_FORWARD) {
        return forward(-units);
    }
    
    /**
     * Turn turtle to the right.
     * 
     * @function right
     */
    function right(angle = DEFAULT_RIGHT) {
        // update untransformed angle
        turtle.ua += angle;
        turtle.ua = _clean_angle(turtle.ua);
        // update transformed angle as well
        turtle.a += angle;
        turtle.a = _clean_angle(turtle.a);
    }
    
    /**
     * Turn turtle to the right.
     * 
     * @function left
     */
    function left(angle = DEFAULT_RIGHT) {
        return right(-angle);
    }
    
    /**
     * Lower the pen.
     * 
     * @function pendown
     */
    function pendown(down = true) {
        turtle.d = down;
    }
    
    /**
     * Raise the pen.
     * 
     * @function penup
     */
    function penup(up = true) {
        turtle.d = !up;
    }
    
    /**
     * Translate the coordinate system.
     * 
     * @function translate
     */
    function translate(tx = 0, ty = 0) {
        // update transformation matrix
        mat3.translate( matrix, matrix, [tx, ty] );
    }
    
    /**
     * Rotate the coordinate system.
     * 
     * @function rotate
     */
    function rotate(ra = 0) {
        // update transformation matrix
        mat3.rotate( matrix, matrix, ra / 180 * Math.PI );
        // update transformed angle as well
        turtle.a += ra;
        turtle.a = _clean_angle(turtle.a);
    }
    
    /**
     * Scale the coordinate system.
     * 
     * @function scale
     */
    function scale(sx = 1, sy = undefined) {
        if (sy === undefined) { sy = sx; }
        // update transformation matrix
        mat3.scale( matrix, matrix, [sx, sy] );
    }
    
    /**
     * Push the turtles state onto the stack.
     * 
     * @function push_turtle
     */
    function push_turtle() {
        turtle_stack.push( Object.assign({}, turtle) ); // push a copy
    }
    
    /**
     * Restore the last pushed turtle state from the stack.
     * 
     * @function pop_turtle
     */
    function pop_turtle() {
        if (turtle_stack.length > 0) {
            turtle = turtle_stack.pop();
        }
    }
    
    /**
     * Push the current transformation matrix onto the stack.
     * 
     * @function push_matrix
     */
    function push_matrix() {
        matrix_stack.push( mat3.clone(matrix) ); // push a copy
    }
    
    /**
     * Restore the last pushed transformation matrix from the stack.
     * 
     * @function pop_matrix
     */
    function pop_matrix() {
        if (matrix_stack.length > 0) {
            matrix = matrix_stack.pop();
        }
    }
    
    /**
     * Push turtle state and transformation matrix onto the stack.
     * 
     * @function push
     */
    function push() {
        push_turtle();
        push_matrix();
    }
    
    /**
     * Restore the last pushed turtle state and transformation matrix from the stack.
     * 
     * @function pop
     */
    function pop() {
        pop_turtle();
        pop_matrix();
    }
    
    /**
     * Get turtle position, heading angle and pen state.
     * 
     * @function getturtle
     */
    function getturtle() {
        return { x: turtle.x, y: turtle.y, a: turtle.a, d: turtle.d };
    }
    
    function _to_turtle(x, y, a, d) {
        // allow [x, y, a, d] as first parameter
        // needs to be tested first, cause arrays of type 'object'
        if (Array.isArray(x)) {
            const arr = x;
            x = arr.at(0);
            y = arr.at(1);
            a = arr.at(2);
            d = arr.at(3);
        }
        // allow {x, y, a, d} as first parameter
        else if (typeof x === 'object' && x !== null) {     
            const obj = x;
            x = obj?.x;
            y = obj?.y;
            a = obj?.a;
            d = obj?.d;
        }
        return { x, y, a, d };
    }
    
    /**
     * Set turtle position and/or heading angle and/or pen state.
     * 
     * @function setturtle
     */
    // TOOD: check new_turtle
    function setturtle(x, y, a, d) {
        const new_turtle = _to_turtle(x, y, a, d);
        setxy(new_turtle.x, new_turtle.y); // tolerates undefined
        if ( Number.isFinite(new_turtle.a) ) { setheading(new_turtle.a); }
        if ( typeof new_turtle.d === 'boolean' ) { pendown(new_turtle.d); }
    }
    
    /**
     * Get full internal state.
     * 
     * @function state
     */
    // Note: this function exposes the actual internal objects
    // TODO: better have whole internal state as an object and expose it directly
    function state() {
        return {
            turtle,
            turtle_stack,
            matrix,
            matrix_stack,
            line_fns,
        };
    }
    
    function set_line_fn(fn) {
        add_line_fn(fn);
    }
    
    function add_line_fn(fn) {
        if (typeof fn === 'function') {
            line_fns.push(fn);
        }
    }
    
    function rm_line_fn(fn) {
        const idx = line_fns.indexOf(fn);
        if (idx >= 0) {
            line_fns.splice(idx, 1);
        }
    }
    
    /**
     * Reset turtle state and transformations.
     * 
     * @function reset
     */
    function reset() {
        reset_turtle();
        reset_matrix();
    }
    
    /**
     * Reset turtle state.
     * 
     * @function reset_turtle
     */
    function reset_turtle() {
        turtle = _make_turtle_state(); // turtle state
        turtle_stack = [];             // turtle stack
    }
    
    /**
     * Reset transformation matrix.
     * 
     * @function reset_turtle
     */
    function reset_matrix() {
        matrix = mat3.create();   // transformation matrix
        matrix_stack = [];        // matrix stack
    }
    
    /**
     * Draw the turtle at its current position.
     * 
     * @function turtle
     */
    function turtle_() {
        const top_angle = 36;
        const height = 15;
        const diamond_size = 1;
        const center = 2/3; // 0 (top) .. 1 (bottom) (2/3 = center of gravity)
        
        const base_angle = (180 - top_angle) / 2;
        const side = height / Math.cos(top_angle/2 / 360 * Math.PI * 2);
        const base = 2 * height * Math.tan(top_angle/2 / 360 * Math.PI * 2);
        const diamond_side = Math.sqrt(2) * diamond_size / 2;
        
        push_turtle();
        
        // center diamond
        penup();
        forward(diamond_size/2);
        pendown();
        right(135); // 180 - 45
        forward(diamond_side);
        right(90);
        forward(diamond_side);
        right(90);
        forward(diamond_side);
        right(90);
        forward(diamond_side);
        left(45);
        
        // turtle
        penup();
        forward(height * center);
        pendown();
        right(180 - top_angle/2);
        forward(side);
        right(180 - base_angle);
        forward(base);
        right(180 - base_angle);
        forward(side);
        
        pop_turtle();
    }
    
    /**
     * Draw a small + at the turtles current position.
     * 
     * @function mark
     */
    function mark(x, y) {
        const size = 10;
        
        push_turtle();
        penup();
        if (x !== undefined && y !== undefined) { setxy(x, y); }
        setheading(0);
        
        push_turtle();
        back(size/2);
        pendown();
        forward(size);
        penup();
        pop_turtle();
        
        right(90);
        back(size/2);
        pendown();
        forward(size);
        pop_turtle();
    }
    
    /**
     * Repeat a function a number of times.
     * 
     * @function repeat
     */
    function repeat(n, fn) {
        if ( !Number.isInteger(n) ) { 
            console.warn('repeat: number is invalid');
            return; 
        }
        
        if (typeof fn !== 'function') {
            console.warn('repeat: function is invalid');
            return;
        }
        
        for (let i=0; i<n; i++) {
            fn(i);
        }
    }
    
    // TODO: this can't work: cond is only evaluated once
    // function until(cond, fn) {
    //     if (typeof fn !== 'function') {
    //         console.warn('until: function is invalid');
    //         return;
    //     }
    //     let i=0;
    //     do {
    //         fn(i);
    //         i += 1;
    //     } while (!cond);
    // }
    // 
    // function while_(cond, fn) {
    //     if (typeof fn !== 'function') {
    //         console.warn('until: function is invalid');
    //         return;
    //     }
    //     let i=0;
    //     while (cond) {
    //         fn(i);
    //         i += 1;
    //     }
    // }
    
    // function _warn(warning_domain, warning) {
    //     if (!warning_domain || !warning) { return; }
    //     console.warn('%s: %s', warning_domain, warning);
    // }
    
    function _check_number(val, warning_domain, var_name, allow_null_undefined = false) {
        if (allow_null_undefined && (val === null || val === undefined)) {
            return true;
        }
        if (!Number.isFinite(val)) {
            if (warning_domain && var_name) {
                console.warn('%s: %s needs to be a proper number (cannot be NaN or Infinity)', warning_domain, var_name);
            }
            return false;
        }
        if (typeof val !== 'number') {
            if (warning_domain && var_name) {
                console.warn('%s: %s needs to be a number', warning_domain, var_name);
            }
            return false;
        }
        return true;
    }
    
    function _to_point(x, y) {
        // allow [x, y] as first parameter
        // needs to be tested first, cause arrays of type 'object'
        if (Array.isArray(x)) {
            const arr = x;
            x = arr.at(0);
            y = arr.at(1);
        }
        // allow {x, y} as first parameter
        else if (typeof x === 'object' && x !== null) {
            const obj = x;
            x = obj?.x;
            y = obj?.y;
        } 
        
        return { x, y };
    }
    
    /**
     * Set the turtles x and y coordinates.
     * 
     * @function setxy
     */
    // TODO: think about naming (e.g. moveto, lineto)
    function setxy(x, y) {
        ({ x, y } = _to_point(x, y));
        if ( ! _check_number(x, 'setxy', 'x', true) ) { return; }
        if ( ! _check_number(y, 'setxy', 'y', true) ) { return; }
        if (x === null || x === undefined) { x = turtle.x; }
        if (y === null || y === undefined) { y = turtle.y; }
        
        // save previous position
        turtle.upx = turtle.ux;
        turtle.upy = turtle.uy;
        turtle.px  = turtle.x;
        turtle.py  = turtle.y;
        
        // new position (untransformed)
        turtle.ux = x;
        turtle.uy = y;
        
        // transformed position
        [ turtle.x, turtle.y ] = _transform( [turtle.ux, turtle.uy], matrix );
        [ turtle.px, turtle.py ] = _transform( [turtle.upx, turtle.upy], matrix );
        _draw();
    }
    
    /**
     * Set the turtles x and y coordinates, without drawing to the new position.
     * 
     * @function jumpxy
     */
    function jumpxy(x, y) {
        const down = isdown(); // save pen down state
        penup();
        setxy(x, y);
        pendown(down); // restore pen down state
    }
    
    /**
     * Set the turtles heading.
     * 
     * @function setheading
     */
    // TODO: think about naming
    function setheading(angle) {
        if ( ! _check_number(angle, 'setheading', 'angle') ) { return; }
        const rotation = turtle.a - turtle.ua; // get rotation applied via rotate()
        // set untransformed angle
        turtle.ua = angle;
        turtle.ua = _clean_angle(turtle.ua);
        // set transformed angle as well
        turtle.a = angle + rotation;
        turtle.a = _clean_angle(turtle.a);
    }
    
    /**
     * Get the turtles x coordinate.
     * 
     * @function xcor
     */
    function xcor() {
        return turtle.x;
    }
    
    /**
     * Get the turtles y coordinate.
     * 
     * @function ycor
     */
    function ycor() {
        return turtle.y;
    }
    
    /**
     * Get the turtles heading.
     * 
     * @function heading
     */
    function heading() {
        return turtle.a;
    }
    
    /**
     * Get whether the pen is currently down.
     * 
     * @function isdown
     */
    function isdown() {
        return turtle.d;
    }
    
    /**
     * Get whether the pen is currently up.
     * 
     * @function isup
     */
    function isup() {
        return !turtle.d;
    }
    
    /**
     * Get the bearing from the turtle to a point x, y.
     * 
     * @function bearing
     */
    function bearing(x, y) {
        ({ x, y } = _to_point(x, y));
        if ( ! _check_number(x, 'bearing', 'x') ) { return; }
        if ( ! _check_number(y, 'bearing', 'y') ) { return; }
        // vector to point xy
        const vx = x - turtle.x;
        const vy = y - turtle.y;
        if (vx == 0 && vy == 0) { return 0; }
        let b = Math.atan2(vy, vx) / Math.PI * 180; // [-180, +180] angle between positive x-axis and vector
        b = b + 90 - turtle.a;
        b = _clean_angle(b);
        return b;
    }
    
    /**
     * Turn the turtle to face a point x, y.
     * 
     * @function face
     */
    function face(x, y) {
        ({ x, y } = _to_point(x, y));
        if ( ! _check_number(x, 'face', 'x') ) { return; }
        if ( ! _check_number(y, 'face', 'y') ) { return; }
        right( bearing(x, y) );
    }
    
    /**
     * Get the distance from the turtle to a point x, y.
     * 
     * @function distance
     */
    function distance(x, y) {
        ({ x, y } = _to_point(x, y));
        if ( ! _check_number(x, 'distance', 'x') ) { return; }
        if ( ! _check_number(y, 'distance', 'y') ) { return; }
        [x, y] = _transform([x, y]); // apply current transformation to point
        const dx = x - turtle.x;
        const dy = y - turtle.y;
        return Math.sqrt(dx*dx + dy*dy);
    }
    
    const self = {
        VERSION,
        // init, // mirror init function, in case people use t.init() instead of tg.init()
        maketurtle,
        self: self_,
        clone,
        forward,
        back,
        right,
        left,
        pendown,
        penup,
        translate,
        rotate,
        scale,
        push,
        pop,
        push_turtle,
        pop_turtle,
        push_matrix,
        pop_matrix,
        getturtle,
        setturtle,
        state,
        set_line_fn,
        add_line_fn,
        rm_line_fn,
        reset,
        reset_turtle,
        reset_matrix,
        turtle: turtle_,
        mark,
        repeat,
        // until,
        // while: while_,
        setxy,
        jumpxy,
        setheading,
        xcor,
        ycor,
        heading,
        isdown,
        isup,
        bearing,
        face,
        distance,
    };
    
    return self;
}


// Fresh instance as default export
export const default_instance = make_turtle_graphics();
export default default_instance;


// Put properties of an object into the global namespace
export function globalize(tg_instance = default_instance, global_object = globalThis) {
    const overwritten = {};
    const failed = {};
    for (const [key, val] of Object.entries(tg_instance).filter( x => ! DONT_GLOBALIZE.includes(x[0]) )) {
        const saved_value = global_object[key];
        try {
            // Use defineProperty, so p5 won't detect the change and complain
            Object.defineProperty(global_object, key, {
                configurable: true,
                enumerable: true,
                writable: true,
                value: val
            });
            if (saved_value !== undefined) {
                overwritten[key] = saved_value;
            }
        } catch {
            failed[key] = saved_value;
        }
    }
    const overwritten_keys = Object.keys(overwritten);
    if (overwritten_keys.length > 0) {
        console.log(`🐢 → Overwritten global properties: ${overwritten_keys.join(', ')}`);
    }
    if (overwritten_keys.length > 0) {
        for (const [key, val] of Object.entries(overwritten)) {
            Object.defineProperty(global_object[GLOBAL_OVERWRITTEN_NAME], key, {
                configurable: true,
                enumerable: true,
                writable: true,
                value: val
            });
        }
        console.log(`🐢 → Overwritten global properties are still available via: ${GLOBAL_OVERWRITTEN_NAME}`);
    }

    if (global_object && global_object[GLOBAL_OVERWRITTEN_NAME] === undefined) {
        global_object[GLOBAL_OVERWRITTEN_NAME] = overwritten;
    }
    
    const failed_keys = Object.keys(failed);
    if (failed_keys.length > 0) {
        console.warn(`🐢 → Failed to overwrite global properties: ${failed_keys.join(', ')}`);
    }
    return overwritten;
}

// Initialize p5.js
// Needs to be called in setup() after createCanvas()
// let _init_called = false;
// 
// export function init(do_globalize = false) {
//     if (_init_called) { return; }
//     if (window.p5?.instance) {
//         console.log(`🐢 → Init: p5.js v${window.p5.VERSION}`);
//         // set line function of default instance
//         default_instance.set_line_fn( window.p5.instance.line.bind(window.p5.instance) );
//         
//         // translate to center on every draw
//         window.p5.instance.registerMethod('pre', function() {
//             default_instance.reset_matrix();
//             window.p5.instance.translate.call( window.p5.instance, window.p5.instance.width/2, window.p5.instance.height/2 );
//         });
//         
//         // translate to center (setup)
//         if (window.p5.instance._setupDone === false) {
//             window.p5.instance.translate.call( window.p5.instance, window.p5.instance.width/2, window.p5.instance.height/2 );
//         }
//         // globalize properties
//         if (do_globalize) { globalize(); }
//     } else {
//         console.warn('🐢 → Init: No p5.js detected');
//     }
//     _init_called = true;
//     return default_instance;
// }


// Bootstrap browser
let _browser_bootstrapped = false;
function is_browser() {
    try {
        return window !== undefined || self !== undefined; 
    } catch {
        return false;
    }
}

// Automatically init p5.js
// Needs to be called after the p5 script is loaded, before the 'load' event
let _init_called = false;

function auto_init(do_globalize = false) {
    if (_init_called) { return; }
    if (window?.p5?.prototype) {
        console.log(`🐢 → Init: p5.js v${window.p5.prototype.VERSION}`);
        // console.log(window.p5.prototype);
        
        // init hook
        // called in the p5 constructor
        // after: _start(), _setup(), _draw(), remove() are added to the instance
        // before: p5 properties are added to the window; _start() is called
        window.p5.prototype._registeredMethods.init.push(function() {
            // 'this' is the p5 instance
            // -> set line function
            default_instance.set_line_fn( this.line.bind(this) );
            
            const original__start = this._start;
            this._start = function(...args) {
                // 'this' is the p5 instance
                // properties have just been added to window
                // -> globalize properties
                if (do_globalize) { globalize(); }
                original__start.call(this, ...args);
            };
        });
        
        // -> translate to center (setup)
        const original_createCanvas = window.p5.prototype.createCanvas;
        window.p5.prototype.createCanvas = function(...args) {
            // 'this' is the p5 instance
            original_createCanvas.call(this, ...args);
            this.translate(this.width/2, this.height/2);
            default_instance._p5_viewbox = [-this.width/2, -this.height/2, this.width, this.height ]; // TODO: beautify
        }
        
        // -> reset transformations, translate to center (draw)
        window.p5.prototype._registeredMethods.pre.push(function() {
            // Warning: 'this' is either window (in p5.global mode) or the p5 instance (in instance mode)
            default_instance.reset_matrix();
            if (this === window) {
                // global mode; instance is available via window.p5.instance
                window.p5.instance.translate.call( window.p5.instance, window.p5.instance.width/2, window.p5.instance.height/2 );
            } else {
                this.translate(this.width/2, this.height/2);
            }
        });
    } else {
        console.warn('🐢 → Init: No p5.js detected');
    }
    _init_called = true;
}

(function bootstrap_browser() {
    if (_browser_bootstrapped) { return; }
    if (is_browser()) {
        console.log(`🐢 Turtle Graphics (v${VERSION})`);
        
        // put lib functions into global scope
        if (window[GLOBAL_LIB_NAME] === undefined) {
            window[GLOBAL_LIB_NAME] = {
                default_turtle: default_instance,
                maketurtle: default_instance.maketurtle,
                // init,
                globalize
            };
            console.log(`🐢 → Global library: ${GLOBAL_LIB_NAME}`);
        }
        
        // put default instance into global scope
        if (window[GLOBAL_INSTANCE_NAME] === undefined) {
            window[GLOBAL_INSTANCE_NAME] = default_instance;
            console.log(`🐢 → Global turtle: ${GLOBAL_INSTANCE_NAME}`);
        }
        
        const url = new URL(import.meta.url);
        const do_globalize = url.searchParams.get('globalize') !== null;
        auto_init(do_globalize);
        
        _browser_bootstrapped = true;
    }
})();
