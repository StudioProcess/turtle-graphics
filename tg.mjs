// TODO: coordinate system orientation
import { vec2, mat3 } from 'gl-matrix';
const EPSILON = 1e-10;
const DEFAULT_FORWARD = 100;
const DEFAULT_RIGHT = 90;
const GLOBAL_VAR_NAME = 't';
const VERSION = 1;

// Constructor function
export function make_turtle_graphics(line_fn_ = undefined) {
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
    let turtle_stack  = [];       // turtle stack
    
    let matrix = mat3.create();   // transformation matrix
    let matrix_stack  = [];       // matrix stack
    
    let line_fn = line_fn_; // line drawing function
    
    /**
     * Create a new turtle instance.
     * 
     * @function maketurtle
     */
    function maketurtle(line_fn_ = undefined) {
        return make_turtle_graphics(line_fn_ || line_fn);
    }
    
    function _draw() {
        if (turtle.d && typeof line_fn === 'function') {
            line_fn(turtle.px, turtle.py, turtle.x, turtle.y);
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
    
    function _transform([x, y], matrix) {
        const p = [ x, y ];
        vec2.transformMat3(p, p, matrix); // Apply given transformation
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
    function state() {
        return {
            turtle,
            turtle_stack,
            matrix,
            matrix_stack,
            line_fn,
        };
    }
    
    function set_line_fn(fn) {
        line_fn = fn;
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
    
    return {
        VERSION,
        maketurtle,
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
    };
}

const default_instance = make_turtle_graphics();

// Put properties of an object into the global namespace
export function globalize(tg_instance = default_instance, global_object = globalThis) {
    for (const [key, val] of Object.entries(tg_instance).filter( x => x[0] != 'VERSION')) {
        if (global_object[key] !== undefined) {
            console.warn(`Global property '${key}' overwritten`);
        }
        global_object[key] = val;
    }
}

// detect p5.js global mode
// -> set line function
// -> put default instance into global scope (defined by GLOBAL_VAR_NAME)
// -> ~~add all functions to global scope~~
// Use of DOMContentloaded makes sure this runs AFTER all script tags, but before p5 init (which runs on the 'load' event)
if (globalThis?.addEventListener !== undefined) {
    const window = globalThis;
    window.addEventListener('DOMContentLoaded', e => {
        console.log(`Turtle graphics (v${VERSION})`);
        if (window?.p5) {
            // console.log(window.p5.instance); // === null
            console.log('-> p5 detected (%s)', window.p5.VERSION);
            
            // proxy the global preload function
            // this is the earliest the p5 instance is available 
            // AND p5 functions are in the global scope (so we can overwrite them)
            const original_preload = window.preload;
            window.preload = (...args) => {
                console.log('-> proxied preload');
                // default_instance.set_line_fn(window.line);
                default_instance.set_line_fn( window.p5.instance.line.bind(window.p5.instance) );
                
                // 'pre' runs before each draw
                window.p5.instance.registerMethod('pre', function() {
                    default_instance.reset_matrix();
                    // "this" is bound to the p5 instance
                    this.translate(this.width/2, this.height/2);
                });
                
                window[GLOBAL_VAR_NAME] = default_instance;
                // globalize();
                
                if (typeof original_preload === 'function') {
                    original_preload(...args);
                }
                
                // Hook into createCanvas()
                // This is the earliest we know the size of the sketch, and can translate to the center
                // So we can use setup-only sketches, provided we have createCanvas()
                const original_createCanvas = window.createCanvas;
                window.createCanvas = (...args) => {
                    console.log('-> proxied createCanvas');
                    if (typeof original_createCanvas === 'function') {
                        original_createCanvas(...args);
                    }
                    // Translate to center
                    window.p5.instance.translate.call( window.p5.instance, window.p5.instance.width/2, window.p5.instance.height/2 );
                };
            };
        }
    });
}

// Fresh instance as default export
export default default_instance;