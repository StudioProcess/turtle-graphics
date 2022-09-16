// TODO: coordinate system orientation

import { vec2, mat3 } from 'gl-matrix';
const EPSILON = 1e-10;
const DEFAULT_FORWARD = 100;
const DEFAULT_RIGHT = 90;

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
    
    let d        = true;           // pen down status
    const matrix = mat3.create();  // transformation matrix
    const stack  = [];             // matrix stack
    
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
    };
}

const default_instance = make_turtle_graphics();

// Put properties of an object into the global namespace
export function globalize(tg_instance = default_instance, global_object = globalThis) {
    for (const [key, val] of Object.entries(tg_instance)) {
        if (global_object[key] !== undefined) {
            console.warn(`Global property '${key}' overwritten`);
        }
        global_object[key] = val;
    }
}

// Fresh instance as default export
export default default_instance;
