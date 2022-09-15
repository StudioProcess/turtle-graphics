import { vec2, mat3 } from 'gl-matrix';

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

export function forward(units) {
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

export function backward(units) {
    return forward(-units);
}

export function right(angle) {
    a += angle;
    a = a % 360;
    if (a < 0) { a += 360; }
}

export function left(angle) {
    return right(-angle);
}

export function pendown() {
    d = true;
}

export function penup() {
    d = false;
}

export function translate(tx, ty) {
    mat3.translate( matrix, matrix, [tx, ty] );
}

export function rotate(ra) {
    mat3.rotate( matrix, matrix, ra / 180 * Math.PI );
}

export function scale(sx, sy) {
    if (sy === undefined) { sy = sx; }
    mat3.scale( matrix, matrix, [sx, sy] );
}

export function push() {
    stack.push(matrix);
}

export function pop() {
    if (stack.length > 0) {
        matrix = stack.pop();
    }
}