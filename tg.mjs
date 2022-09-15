import { vec2, mat3 } from 'gl-matrix';

// Constructor function
export function make_turtle_graphics() {
    let x, y     = 0;    // position
    let px, py   = 0;    // previous position
    let a        = 0;    // angle (in degrees)
    let d        = true; // pen down status
    const matrix = mat3.create();  // transformation matrix
    const stack  = [];             // matrix stack
    
    let line_fn; // line drawing function
    
    function draw() {
        if (d && typeof line_fn === 'function') {
            line_fn(px, py, x, y);
        }
    }
    
    function forward(units) {
        px = x;
        py = y;
        const angle_rad = (a-90) / 2 / Math.PI;
        // The velocity vector
        const v = [
            units * Math.cos(angle_rad),
            units * Math.sin(angle_rad)
        ];
        vec2.transformMat3(v, v, matrix); // Apply current transformation
        x += v[0];
        y += v[1];
        draw();
    }
    
    function backward(units) {
        return forward(-units);
    }
    
    function right(angle) {
        a += angle;
        a = a % 360;
        if (a < 0) { a += 360; }
    }
    
    function left(angle) {
        return right(-angle);
    }
    
    function pendown() {
        d = true;
    }
    
    function penup() {
        d = false;
    }
    
    function translate(tx, ty) {
        mat3.translate( matrix, matrix, [tx, ty] );
    }
    
    function rotate(ra) {
        mat3.rotate( matrix, matrix, ra / 180 * Math.PI );
    }
    
    function scale(sx, sy) {
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
      pop  
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
