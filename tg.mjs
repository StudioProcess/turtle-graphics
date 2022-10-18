// TODO: coordinate system orientation
import { vec2, mat3 } from 'gl-matrix';
const EPSILON = 1e-10;
const DEFAULT_FORWARD = 100;
const DEFAULT_RIGHT = 90;
const GLOBAL_VAR_NAME = 't';
const VERSION = 1;

// Constructor function
export function make_turtle_graphics() {
    function create_turtle() {
        return {
            x:   0,    // position (x)
            y:   0,    // position (y)
            px:  0,    // previous position (x)
            py:  0,    // previous position (y)
            a:   0,    // angle (in degrees)
            
            // untransformed state
            ux:  0,
            uy:  0,
            // upx: 0,    // TODO: not really needed?
            // upy: 0,    // TODO: not really needed?
            ua:  0,
            
            d:   true, // pen down status
        };
    }
    
    let turtle = create_turtle(); // turtle state
    let turtle_stack  = [];       // turtle stack
    
    let matrix = mat3.create();   // transformation matrix
    let matrix_stack  = [];       // matrix stack
    
    let line_fn; // line drawing function
    
    function draw() {
        if (turtle.d && typeof line_fn === 'function') {
            line_fn(turtle.px, turtle.py, turtle.x, turtle.y);
        }
    }
    
    // 50.000000000000014 -> 50
    function clean_zero(v) {
        if (Math.abs(v % 1) < EPSILON) {
            return Math.trunc(v);
        } else {
            return v;
        }
    }
    
    function clean_angle(a) {
        a = a % 360;
        if (a < 0) { a += 360; }
        return a;
    }
    
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
        const p = [ turtle.ux, turtle.uy ];
        vec2.transformMat3(p, p, matrix); // Apply current transformation
        p[0] = clean_zero(p[0]);
        p[1] = clean_zero(p[1]);
        turtle.x = p[0];
        turtle.y = p[1];
        draw();
    }
    
    function back(units = DEFAULT_FORWARD) {
        return forward(-units);
    }
    
    function right(angle = DEFAULT_RIGHT) {
        // update untransformed angle
        turtle.ua += angle;
        turtle.ua = clean_angle(turtle.ua);
        // update transformed angle as well
        turtle.a += angle;
        turtle.a = clean_angle(turtle.a);
    }
    
    function left(angle = DEFAULT_RIGHT) {
        return right(-angle);
    }
    
    function pendown(down = true) {
        turtle.d = down;
    }
    
    function penup(up = true) {
        turtle.d = !up;
    }
    
    function translate(tx = 0, ty = 0) {
        // update transformation matrix
        mat3.translate( matrix, matrix, [tx, ty] );
    }
    
    function rotate(ra = 0) {
        // update transformation matrix
        mat3.rotate( matrix, matrix, ra / 180 * Math.PI );
        // update transformed angle as well
        turtle.a += ra;
        turtle.a = clean_angle(turtle.a);
    }
    
    function scale(sx = 1, sy = undefined) {
        if (sy === undefined) { sy = sx; }
        // update transformation matrix
        mat3.scale( matrix, matrix, [sx, sy] );
    }
    
    function push_turtle() {
        turtle_stack.push( Object.assign({}, turtle) ); // push a copy
    }
    
    function pop_turtle() {
        if (turtle_stack.length > 0) {
            turtle = turtle_stack.pop();
        }
    }
    
    function push_matrix() {
        matrix_stack.push( mat3.clone(matrix) ); // push a copy
    }
    
    function pop_matrix() {
        if (matrix_stack.length > 0) {
            matrix = matrix_stack.pop();
        }
    }
    
    function push() {
        push_turtle();
        push_matrix();
    }
    
    function pop() {
        pop_turtle();
        pop_matrix();
    }
    
    // Note: this function exposes the actual internal objects
    function state() {
        return {
            turtle,
            turtle_stack,
            matrix,
            matrix_stack,
        };
    }
    
    function set_line_fn(fn) {
        line_fn = fn;
    }
    
    function reset() {
        turtle = create_turtle(); // turtle state
        turtle_stack = [];        // turtle stack
        
        matrix = mat3.create();   // transformation matrix
        matrix_stack = [];        // matrix stack
    }
    
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
        else if (typeof x === 'object') {
            const obj = x;
            x = obj?.x;
            y = obj?.y;
        } 
        
        return { x, y };
    }
    
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
        const p = [ turtle.ux, turtle.uy ];
        vec2.transformMat3(p, p, matrix); // Apply current transformation
        p[0] = clean_zero(p[0]);
        p[1] = clean_zero(p[1]);
        turtle.x = p[0];
        turtle.y = p[1];
        draw();
    }
    
    // TODO: think about naming
    function setheading(angle) {
        if ( ! _check_number(angle, 'setheading', 'angle') ) { return; }
        const rotation = turtle.a - turtle.ua; // get rotation applied via rotate()
        // set untransformed angle
        turtle.ua = angle;
        turtle.ua = clean_angle(turtle.ua);
        // set transformed angle as well
        turtle.a = angle + rotation;
        turtle.a = clean_angle(turtle.a);
    }
    
    function xcor() {
        return turtle.x;
    }
    
    function ycor() {
        return turtle.y;
    }
    
    function heading() {
        return turtle.a;
    }
    
    function isdown() {
        return turtle.d;
    }
    
    function isup() {
        return !turtle.d;
    }
    
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
        b = clean_angle(b);
        return b;
    }
    
    function face(x,y) {
        ({ x, y } = _to_point(x, y));
        if ( ! _check_number(x, 'face', 'x') ) { return; }
        if ( ! _check_number(y, 'face', 'y') ) { return; }
        right( bearing(x, y) );
    }
    
    return {
        VERSION,
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
        state,
        set_line_fn,
        reset,
        turtle: turtle_,
        repeat,
        // until,
        // while: while_,
        setxy,
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
                    default_instance.reset();
                    // "this" is bound to the p5 instance
                    this.translate(this.width/2, this.height/2);
                });
                
                window[GLOBAL_VAR_NAME] = default_instance;
                // globalize();
                
                if (typeof original_preload === 'function') {
                    original_preload(...args);
                }
            };
        }
    });
}

// Fresh instance as default export
export default default_instance;