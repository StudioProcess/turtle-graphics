// TODO: coordinate system orientation
import { vec2, mat3 } from 'gl-matrix';

const VERSION = 3;
const EPSILON = 1e-10;
const DEFAULT_FORWARD = 100;
const DEFAULT_RIGHT = 90;
const GLOBAL_LIB_NAME = 'tg';
const GLOBAL_INSTANCE_NAME = 't';
const GLOBAL_OVERWRITTEN_NAME = 'p5';
const DONT_GLOBALIZE = [ 'VERSION' ];


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
    
    // Full internal state
    const _state = {
        turtle:       _make_turtle_state(), // turtle state
        turtle_stack: [],                   // turtle stack
        matrix:       mat3.create(),        // transformation matrix
        matrix_stack: [],                   // matrix stack
        line_fns:     [...line_fns_],       // line drawing callbacks
    };
    
    
    // Aliases and deprecation mechanism
    const _aliases = {};
    const _aliases_deprecated = {};
    function _add_aliases(orig, aliases, aliases_array = _aliases) {
        if (!(orig in aliases_array)) { aliases_array[orig] = []; }
        aliases_array[orig].push(...aliases);
    }
    function _add_aliases_deprecated(orig, aliases) {
        return _add_aliases(orig, aliases, _aliases_deprecated);
    }
    
    
    /*********************************************************
        Instance
     *********************************************************/
    
    /**
     * Create a new turtle instance.
     * 
     * @function newturtle
     */
    function newturtle(...new_line_fns) {
        // use same line_fns as the current instance, if none are explicitly provided
        return make_turtle_graphics(
            ...(new_line_fns.length > 0 ? new_line_fns : _state.line_fns)
        );
    }
    _add_aliases_deprecated('newturtle', ['maketurtle']);
    
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
    function clone() {
        const newturtle = make_turtle_graphics(...line_fns_); // make new turtle with same line_fns
        // clone all internal state properties except for line_fns (which cannot be cloned, because it containes functions)
        for (let key of Object.keys(_state).filter(x => x !== 'line_fns')) {
            newturtle._state()[key] = structuredClone( _state[key] );
        }
        return newturtle;
    }
    
    
    /*********************************************************
        Basic
     *********************************************************/
    
    function _draw() {
        const turtle = _state.turtle;
        if (!turtle.d) { return; } // don't draw if pen isn't down
        for (let line_fn of _state.line_fns) {
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
        m = m ?? _state.matrix; // use current matrix by default
        vec2.transformMat3(p, p, m); // Apply given transformation
        p[0] = _clean_zero(p[0]);
        p[1] = _clean_zero(p[1]);
        return p;
    }
    
    /**
     * Move the turtle forward.
     * <br>
     * Draws a line, if the pen is down (see {@link pendown} and {@link penup}).
     * 
     * @function forward
     * @param [distance=100] {number} - How far to move forward, in pixels.
     * @see {@link back} to move back.
     */
    function forward(units = DEFAULT_FORWARD) {
        const turtle = _state.turtle;
        const matrix = _state.matrix;
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
     * Move the turtle back.
     * <br>
     * Draws a line, if the pen is down (see {@link pendown} and {@link penup}).
     * 
     * @function back
     * @param [distance=100] {number} - How far to move back, in pixels.
     * @see {@link forward} to move forward.
     */
    function back(units = DEFAULT_FORWARD) {
        return forward(-units);
    }
    
    /**
     * Turn turtle to the right.
     * 
     * @function right
     * @param [angle=90] {number} - How far to turn the turtle right, in degrees (0–360).
     * @see {@link left} to turn left.
     */
    function right(angle = DEFAULT_RIGHT) {
        const turtle = _state.turtle;
        // update untransformed angle
        turtle.ua += angle;
        turtle.ua = _clean_angle(turtle.ua);
        // update transformed angle as well
        turtle.a += angle;
        turtle.a = _clean_angle(turtle.a);
    }
    
    /**
     * Turn turtle to the left.
     * 
     * @function left
     * @param [angle=90] {number} - How far to turn the turtle left, in degrees (0–360).
     * @see {@link right} to turn right.
     */
    function left(angle = DEFAULT_RIGHT) {
        return right(-angle);
    }
    
    /**
     * Lower the pen.
     * <br>
     * Subsequent uses of {@link forward} and {@link back} will draw lines.
     * A new turtle starts with the pen down.
     * 
     * @function pendown
     * @see {@link penup} to raise the pen.
     */
    function pendown(down = true) {
        _state.turtle.d = down;
    }
    
    /**
     * Raise the pen.
     * <br>
     * Subsequent uses of {@link forward} and {@link back} will NOT draw lines.
     * A new turtle starts with the pen down.
     * 
     * @function penup
     * @see {@link penup} to lower the pen.
     */
    function penup(up = true) {
        _state.turtle.d = !up;
    }
    
    
    /*********************************************************
        Transformations
     *********************************************************/
    
    /**
     * Translate the coordinate system.
     * 
     * @function translate
     */
    function translate(tx = 0, ty = 0) {
        // update transformation matrix
        mat3.translate( _state.matrix, _state.matrix, [tx, ty] );
    }
    
    /**
     * Rotate the coordinate system.
     * 
     * @function rotate
     */
    function rotate(ra = 0) {
        const turtle = _state.turtle;
        // update transformation matrix
        mat3.rotate( _state.matrix, _state.matrix, ra / 180 * Math.PI );
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
        mat3.scale( _state.matrix, _state.matrix, [sx, sy] );
    }
    
    
    /*********************************************************
        Stacks
     *********************************************************/
    
    /**
     * Push the turtles state onto the stack.
     * 
     * @function pushstate
     */
    function pushstate() {
        _state.turtle_stack.push( Object.assign({}, _state.turtle) ); // push a copy
    }
    _add_aliases_deprecated('pushstate', ['push_turtle']);
    
    /**
     * Restore the last pushed turtle state from the stack.
     * 
     * @function popstate
     */
    function popstate() {
        if (_state.turtle_stack.length > 0) {
            _state.turtle = _state.turtle_stack.pop();
        }
    }
    _add_aliases_deprecated('popstate', ['pop_turtle']);
    
    /**
     * Push the current transformation matrix onto the stack.
     * 
     * @function pushmatrix
     */
    function pushmatrix() {
        _state.matrix_stack.push( mat3.clone(_state.matrix) ); // push a copy
    }
    _add_aliases_deprecated('pushmatrix', ['push_matrix']);
    
    /**
     * Restore the last pushed transformation matrix from the stack.
     * 
     * @function popmatrix
     */
    function popmatrix() {
        if (_state.matrix_stack.length > 0) {
            _state.matrix = _state.matrix_stack.pop();
        }
    }
    _add_aliases_deprecated('popmatrix', ['pop_matrix']);
    
    /**
     * Push turtle state and transformation matrix onto the stack.
     * 
     * @function push
     */
    function push() {
        pushstate();
        pushmatrix();
    }
    
    /**
     * Restore the last pushed turtle state and transformation matrix from the stack.
     * 
     * @function pop
     */
    function pop() {
        popstate();
        popmatrix();
    }
    
    
    /*********************************************************
        Get state
     *********************************************************/
    
    /**
     * Get the turtles position.
     * 
     * @function xy
     */
    // TODO: test this
    function xy() {
        return [ _state.turtle.x, _state.turtle.y ];
    }
    
    /**
     * Get the turtles x coordinate.
     * 
     * @function x
     */
    function x() {
        return _state.turtle.x;
    }
    _add_aliases_deprecated('x', ['xcor']);
    
    /**
     * Get the turtles y coordinate.
     * 
     * @function y
     */
    function y() {
        return _state.turtle.y;
    }
    _add_aliases_deprecated('y', ['ycor']);
    
    /**
     * Get the turtles heading.
     * 
     * @function heading
     */
    function heading() {
        return _state.turtle.a;
    }
    
    /**
     * Get whether the pen is currently down.
     * 
     * @function isdown
     */
    function isdown() {
        return _state.turtle.d;
    }
    
    /**
     * Get whether the pen is currently up.
     * 
     * @function isup
     */
    function isup() {
        return !_state.turtle.d;
    }
    
    /**
     * Get turtle position, heading angle and pen position.
     * 
     * @function state
     */
    function state() {
        const turtle = _state.turtle;
        return { x: turtle.x, y: turtle.y, a: turtle.a, d: turtle.d };
    }
    _add_aliases_deprecated('state', ['getturtle']);
    
    
    /*********************************************************
        Get relative state
     *********************************************************/
    
    /**
     * Get the bearing from the turtle to a point x, y.
     * 
     * @function bearing
     */
    function bearing(x, y) {
        ({ x, y } = _to_point(x, y));
        if ( ! _check_number(x, 'bearing', 'x') ) { return; }
        if ( ! _check_number(y, 'bearing', 'y') ) { return; }
        const turtle = _state.turtle;
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
     * Get the distance from the turtle to a point x, y.
     * 
     * @function distance
     */
    function distance(x, y) {
        ({ x, y } = _to_point(x, y));
        if ( ! _check_number(x, 'distance', 'x') ) { return; }
        if ( ! _check_number(y, 'distance', 'y') ) { return; }
        [x, y] = _transform([x, y]); // apply current transformation to point
        const turtle = _state.turtle;
        const dx = x - turtle.x;
        const dy = y - turtle.y;
        return Math.sqrt(dx*dx + dy*dy);
    }
    
    
    /*********************************************************
        Set state
     *********************************************************/
     
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
        const turtle = _state.turtle;
        const matrix = _state.matrix;
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
        const turtle = _state.turtle;
        const rotation = turtle.a - turtle.ua; // get rotation applied via rotate()
        // set untransformed angle
        turtle.ua = angle;
        turtle.ua = _clean_angle(turtle.ua);
        // set transformed angle as well
        turtle.a = angle + rotation;
        turtle.a = _clean_angle(turtle.a);
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
     * @function setstate
     */
    // TOOD: check new_turtle
    function setstate(x, y, a, d) {
        const new_turtle = _to_turtle(x, y, a, d);
        setxy(new_turtle.x, new_turtle.y); // tolerates undefined
        if ( Number.isFinite(new_turtle.a) ) { setheading(new_turtle.a); }
        if ( typeof new_turtle.d === 'boolean' ) { pendown(new_turtle.d); }
    }
    _add_aliases_deprecated('setstate', ['setturtle']);
    
    /**
     * Reset turtle state.
     * 
     * @function resetstate
     */
    function resetstate() {
        _state.turtle = _make_turtle_state(); // turtle state
        _state.turtle_stack = [];             // turtle stack
    }
    _add_aliases_deprecated('resetstate', ['reset_turtle']);
    
    /**
     * Reset transformation matrix.
     * 
     * @function resetmatrix
     */
    function resetmatrix() {
        _state.matrix = mat3.create();   // transformation matrix
        _state.matrix_stack = [];        // matrix stack
    }
    _add_aliases_deprecated('resetmatrix', ['reset_matrix']);
    
    /**
     * Reset turtle state and transformations.
     * 
     * @function reset
     */
    function reset() {
        resetstate();
        resetmatrix();
    }
    
    
    /*********************************************************
        Markings
     *********************************************************/
    
    /**
     * Draw the turtle at its current position.
     * 
     * @function show
     */
    function show() {
        const top_angle = 36;
        const height = 15;
        const diamond_size = 1;
        const center = 2/3; // 0 (top) .. 1 (bottom) (2/3 = center of gravity)
        
        const base_angle = (180 - top_angle) / 2;
        const side = height / Math.cos(top_angle/2 / 360 * Math.PI * 2);
        const base = 2 * height * Math.tan(top_angle/2 / 360 * Math.PI * 2);
        const diamond_side = Math.sqrt(2) * diamond_size / 2;
        
        pushstate();
        
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
        
        popstate();
    }
    _add_aliases_deprecated('show', ['turtle']);
    
    /**
     * Draw a small + at the turtles current position.
     * 
     * @function mark
     */
    function mark(x, y) {
        const size = 10;
        
        pushstate();
        penup();
        if (x !== undefined && y !== undefined) { setxy(x, y); }
        setheading(0);
        
        pushstate();
        back(size/2);
        pendown();
        forward(size);
        penup();
        popstate();
        
        right(90);
        back(size/2);
        pendown();
        forward(size);
        popstate();
    }
    
    
    /*********************************************************
        Util
     *********************************************************/
    
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
    
    
    /*********************************************************
        Internal
     *********************************************************/
    
    /**
     * Get full internal state.
     * 
     * @function _state
     */
    // Note: this function exposes the actual internal objects
    function _state_() {
        return _state;
    }
    
    /**
     * Add function to be called when a line is drawn by the library.
     * 
     * @function _add_line_fn
     */
    function _add_line_fn(fn) {
        if (typeof fn === 'function') {
            _state.line_fns.push(fn);
        }
    }
    
    /**
     * Remove a function previously added by {@link _add_line_fn}.
     * 
     * @function _rm_line_fn
     */
    function _rm_line_fn(fn) {
        const line_fns = _state.line_fns;
        const idx = line_fns.indexOf(fn);
        if (idx >= 0) {
            line_fns.splice(idx, 1);
        }
    }
    
    
    const self = {
        VERSION,
        // Instance
        newturtle,
        self: self_,
        clone,
        // Basics
        forward,
        back,
        right,
        left,
        pendown,
        penup,
        // Transformations
        translate,
        rotate,
        scale,
        // Stacks
        pushstate,
        popstate,
        pushmatrix,
        popmatrix,
        push,
        pop,
        // Get state
        xy,
        x,
        y,
        heading,
        isdown,
        isup,
        state,
        // Get relative state
        bearing,
        distance,
        // Set state
        setxy,
        jumpxy,
        setheading,
        face,
        setstate,
        resetstate,
        resetmatrix,
        reset,
        // Markings
        show,
        mark,
        // Util
        repeat,
        // Internal
        _state: _state_,
        _add_line_fn,
        _rm_line_fn,
    };
    
    // add aliases
    for (let [orig, aliases] of Object.entries(_aliases)) {
        for (let alias of aliases) {
            if (!(alias in self) && orig in self) {
                self[alias] = self[orig];
            }
        }
    }
    // add deprecations
    for (let [orig, aliases] of Object.entries(_aliases_deprecated)) {
        for (let alias of aliases) {
            if (!(alias in self) && orig in self) {
                self[alias] = function(...args) {
                    console.warn(`🐢 '${alias}' is deprecated. Please use '${orig}' instead.`);
                    return self[orig](...args);
                };
            }
        }
    }
    
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
            default_instance._add_line_fn( this.line.bind(this) );
            
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
            default_instance.resetmatrix();
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
