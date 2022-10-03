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
    
    function pendown() {
        turtle.d = true;
    }
    
    function penup() {
        turtle.d = false;
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
        turtle_stack.push(turtle);
    }
    
    function pop_turtle() {
        if (turtle_stack.length > 0) {
            turtle = turtle.pop();
        }
    }
    
    function push_matrix() {
        matrix_stack.push(matrix);
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
    
    function state() {
        return {
            x: turtle.x, y: turtle.y,
            px: turtle.px, py: turtle.py,
            a: turtle.a,
            d: turtle.d,
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
        const original_d = d; // remember pen state
        const diamond_side = Math.sqrt(2) * diamond_size / 2;
        
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
        penup();
        right(180 - top_angle/2);
        forward(height * center);
        right(180);
        d = original_d;
    }
    
    function repeat(n, fn) {
        if (!Number.isInteger(n) && n !== Infinity ) { 
            // n is invalid
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
    
    return {
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
      state,
      set_line_fn,
      reset,
      turtle: turtle_,
      repeat,
      VERSION,
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