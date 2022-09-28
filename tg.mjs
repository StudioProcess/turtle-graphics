// TODO: coordinate system orientation
import { vec2, mat3 } from 'gl-matrix';
const EPSILON = 1e-10;
const DEFAULT_FORWARD = 100;
const DEFAULT_RIGHT = 90;
const GLOBAL_VAR_NAME = 't';
const VERSION = 1;

// Constructor function
export function make_turtle_graphics() {
    // transformed state
    let x        = 0;    // position (x)
    let y        = 0;    // position (y)
    let px       = 0;    // previous position (x)
    let py       = 0;    // previous position (y)
    let a        = 0;    // angle (in degrees)
    
    // untransformed state
    let ux       = 0;
    let uy       = 0;
    let upx      = 0;    // TODO: not really needed?
    let upy      = 0;    // TODO: not really needed?
    let ua       = 0;
    
    let d      = true;             // pen down status
    let matrix = mat3.create();    // transformation matrix
    let stack  = [];               // matrix stack
    
    let line_fn; // line drawing function
    
    function draw() {
        if (d && typeof line_fn === 'function') {
            line_fn(px, py, x, y);
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
        upx = ux;
        upy = uy;
        px  = x;
        py  = y;
        
        // new position (untransformed)
        const angle_rad = ( ua - 90 ) / 180 * Math.PI;
        ux += units * Math.cos(angle_rad);
        uy += units * Math.sin(angle_rad);
        
        // transformed position
        const p = [ ux, uy ];
        vec2.transformMat3(p, p, matrix); // Apply current transformation
        p[0] = clean_zero(p[0]);
        p[1] = clean_zero(p[1]);
        x = p[0];
        y = p[1];
        draw();
    }
    
    function backward(units = DEFAULT_FORWARD) {
        return forward(-units);
    }
    
    function right(angle = DEFAULT_RIGHT) {
        // update untransformed angle
        ua += angle;
        ua = clean_angle(ua);
        // update transformed angle as well
        a += angle;
        a = clean_angle(a);
    }
    
    function left(angle = DEFAULT_RIGHT) {
        return right(-angle);
    }
    
    function pendown() {
        d = true;
    }
    
    function penup() {
        d = false;
    }
    
    function translate(tx = 0, ty = 0) {
        mat3.translate( matrix, matrix, [tx, ty] );
    }
    
    function rotate(ra = 0) {
        mat3.rotate( matrix, matrix, ra / 180 * Math.PI );
        // update transformed angle as well
        a += ra;
        a = clean_angle(a);
    }
    
    function scale(sx = 1, sy = undefined) {
        if (sy === undefined) { sy = sx; }
        mat3.scale( matrix, matrix, [sx, sy] );
    }
    
    function push() {
        stack.push(matrix);
    }
    
    function pop() {
        if (stack.length > 0) {
            matrix = stack.pop();
        }
    }
    
    function state() {
        return {
            x, y,
            px, py,
            a,
            d,
            matrix,
            stack,
        };
    }
    
    function set_line_fn(fn) {
        line_fn = fn;
    }
    
    function reset() {
        x        = 0;    // position (x)
        y        = 0;    // position (y)
        px       = 0;    // previous position (x)
        py       = 0;    // previous position (y)
        a        = 0;    // angle (in degrees)
        
        // untransformed state
        ux       = 0;
        uy       = 0;
        upx      = 0;    // TODO: not really needed?
        upy      = 0;    // TODO: not really needed?
        ua       = 0;
        
        d      = true;             // pen down status
        matrix = mat3.create();    // transformation matrix
        stack  = [];               // matrix stack
    }
    
    function turtle() {
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
    
    return {
      forward,
      backward,
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
      turtle,
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
if (window?.addEventListener) {
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