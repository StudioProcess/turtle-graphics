import tap from 'tap';
import * as tg from './tg.mjs';

// console.log(tap);
// console.log(tg);

// TODO:
// * setxy, setheading
// * xcor, ycor, heading, isdown, isup
// * bearing, face
// * until, while

tap.test('instance creation', async t => {
    const g = tg.make_turtle_graphics();
    t.ok(g, 'non empty object created');
    t.same(g, tg.default, 'instance similar to default instance');
    t.ok(typeof g.VERSION === 'number' || typeof g.VERSION === 'string', 'check VERSION property');
});

tap.test('globalize', async t => {
    const g = tg.make_turtle_graphics();
    const obj = {};
    tg.globalize(g, obj);
    t.match(g, obj, 'global object has properties now'); // use match because obj won't have VERSION
});

tap.test('state', async t => {
    const g = tg.make_turtle_graphics();
    const s = g.state();
    t.hasProps(g.state(), ['turtle', 'turtle_stack', 'matrix', 'matrix_stack']);
});

tap.test('forward', async t => {
    const g = tg.make_turtle_graphics();
    t.match(g.state().turtle, { x:0, y:0, a:0 });
    g.forward(100);
    t.match(g.state().turtle, { x:0, y:-100, a:0 });
    g.forward(50);
    t.match(g.state().turtle, { x:0, y:-150, a:0 });
    g.forward(25);
    t.match(g.state().turtle, { x:0, y:-175, a:0 });
    g.forward(0);
    t.match(g.state().turtle, { x:0, y:-175, a:0 });
    g.forward();
    t.match(g.state().turtle, { x:0, y:-275, a:0 });
    g.forward(-275);
    t.match(g.state().turtle, { x:0, y:0, a:0 });
});

tap.test('back', async t => {
    const g = tg.make_turtle_graphics();
    t.match(g.state().turtle, { x:0, y:0, a:0 });
    g.back(100);
    t.match(g.state().turtle, { x:0, y:100, a:0 });
    g.back(50);
    t.match(g.state().turtle, { x:0, y:150, a:0 });
    g.back(25);
    t.match(g.state().turtle, { x:0, y:175, a:0 });
    g.back(0);
    t.match(g.state().turtle, { x:0, y:175, a:0 });
    g.back();
    t.match(g.state().turtle, { x:0, y:275, a:0 });
    g.back(-275);
    t.match(g.state().turtle, { x:0, y:0, a:0 });
});

tap.test('right', async t => {
    const g = tg.make_turtle_graphics();
    g.right(90);
    t.match(g.state().turtle, { x:0, y:0, a:90 });
    g.right(90);
    t.match(g.state().turtle, { x:0, y:0, a:180 });
    g.right(90);
    t.match(g.state().turtle, { x:0, y:0, a:270 });
    g.right(90);
    t.match(g.state().turtle, { x:0, y:0, a:0 });
    g.right(0);
    t.match(g.state().turtle, { x:0, y:0, a:0 });
    g.right();
    t.match(g.state().turtle, { x:0, y:0, a:90 });
    g.right(-90);
    t.match(g.state().turtle, { x:0, y:0, a:0 });
    g.right(-370);
    t.match(g.state().turtle, { x:0, y:0, a:350 });
});

tap.test('left', async t => {
    const g = tg.make_turtle_graphics();
    g.left(90);
    t.match(g.state().turtle, { x:0, y:0, a:270 });
    g.left(90);
    t.match(g.state().turtle, { x:0, y:0, a:180 });
    g.left(90);
    t.match(g.state().turtle, { x:0, y:0, a:90 });
    g.left(90);
    t.match(g.state().turtle, { x:0, y:0, a:0 });
    g.left(0);
    t.match(g.state().turtle, { x:0, y:0, a:0 });
    g.left();
    t.match(g.state().turtle, { x:0, y:0, a:270 });
    g.left(-90);
    t.match(g.state().turtle, { x:0, y:0, a:0 });
    g.left(-370);
    t.match(g.state().turtle, { x:0, y:0, a:10 });
});

tap.test('square movement', async t => {
    const g = tg.make_turtle_graphics();
    g.forward(100);
    t.match(g.state().turtle, { x:0, y:-100, a:0 });
    g.right(90);
    t.match(g.state().turtle, { x:0, y:-100, a:90 });
    g.forward(100);
    t.match(g.state().turtle, { x:100, y:-100, a:90 });
    g.right(90);
    t.match(g.state().turtle, { x:100, y:-100, a:180 });
    g.forward(100);
    t.match(g.state().turtle, { x:100, y:0, a:180 });
    g.right(90);
    t.match(g.state().turtle, { x:100, y:0, a:270 });
    g.forward(100);
    t.match(g.state().turtle, { x:0, y:0, a:270 });
    g.right(90);
    t.match(g.state().turtle, { x:0, y:0, a:0 });
});

tap.test('pen', async t => {
    const g = tg.make_turtle_graphics();
    t.match(g.state().turtle, { d:true });
    g.pendown();
    t.match(g.state().turtle, { d:true });
    g.penup();
    t.match(g.state().turtle, { d:false });
    g.penup();
    t.match(g.state().turtle, { d:false });
    // TODO: test line_fn not being called with penup
});

tap.test('translate', async t => {
    const g = tg.make_turtle_graphics();
    g.translate(100, 50);
    t.match(g.state().turtle, { x:0, y:0, a:0 }, 'no immediate change');
    g.forward(0);
    t.match(g.state().turtle, { x:100, y:50, a:0 });
    g.forward(0);
    t.match(g.state().turtle, { x:100, y:50, a:0 });
    
    g.translate();
    g.forward(0);
    t.match(g.state().turtle, { x:100, y:50, a:0 }, 'no argument');
    g.translate(10);
    g.forward(0);
    t.match(g.state().turtle, { x:110, y:50, a:0 }, 'single argument');
    g.translate(-110, 50);
    g.forward(100);
    t.match(g.state().turtle, { x:0, y:0, a:0 });
});

tap.test('rotate', async t => {
    const g = tg.make_turtle_graphics();
    g.rotate(90);
    g.forward(100);
    t.match(g.state().turtle, { x:100, y:0, a:90 });
    g.right(90);
    t.match(g.state().turtle, { x:100, y:0, a:180 });
    g.forward(100);
    t.match(g.state().turtle, { x:100, y:100, a:180 });
    g.rotate(-90);
    g.forward(0);
    t.match(g.state().turtle, { x:100, y:-100, a:90 });
    g.rotate();
    g.forward(0);
    t.match(g.state().turtle, { x:100, y:-100, a:90 }, 'no argument');
});

tap.test('scale', async t => {
    let g;
    g = tg.make_turtle_graphics();
    g.scale(2, 2);
    g.forward(0);
    t.match(g.state().turtle, { x:0, y:0, a:0 }, 'in origin');
    g.forward(100);
    t.match(g.state().turtle, { x:0, y:-200, a:0 });
    g.right(90);
    g.forward(100);
    t.match(g.state().turtle, { x:200, y:-200, a:90 });
    g.scale(1, 1);
    g.forward(0);
    t.match(g.state().turtle, { x:200, y:-200, a:90 });
    g.scale(0.5, 0.5);
    g.forward(0);
    t.match(g.state().turtle, { x:100, y:-100, a:90 });
    g = tg.make_turtle_graphics();
    g.scale(2, 0.5);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state().turtle, { x:200, y:-50, a:90 }, 'differing arguments');
    g = tg.make_turtle_graphics();
    g.scale(2);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state().turtle, { x:200, y:-200, a:90 }, 'single argument');
    g = tg.make_turtle_graphics();
    g.scale();
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state().turtle, { x:100, y:-100, a:90 }, 'no argument');
});

tap.test('compound transformations', async t => {
    let g;
    g = tg.make_turtle_graphics();
    g.scale(2, 0.5);
    g.translate(100, 50);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state().turtle, { x:400, y:-25, a:90 }, 'S/T');
    
    g = tg.make_turtle_graphics();
    g.translate(100, 50);
    g.scale(2, 0.5);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state().turtle, { x:300, y:0, a:90 }, 'T/S');
    
    g = tg.make_turtle_graphics();
    g.scale(2, 0.5);
    g.rotate(90);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state().turtle, { x:200, y:50, a:180 }, 'S/R'); // weird, but confirmed with p5
    
    g = tg.make_turtle_graphics();
    g.rotate(90);
    g.scale(2, 0.5);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state().turtle, { x:50, y:200, a:180 }, 'R/S'); // confirmed with p5
    
    g = tg.make_turtle_graphics();
    g.rotate(90);
    g.translate(100, 50);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state().turtle, { x:50, y:200, a:180 }, 'R/T'); // confirmed with p5
    
    g = tg.make_turtle_graphics();
    g.translate(100, 50);
    g.rotate(90);
    g.forward(0);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state().turtle, { x:200, y:150, a:180 }, 'T/R'); // confirmed with p5
});

tap.test('set_line_fn', async t => {
    const g = tg.make_turtle_graphics();
    let calls = [];
    function line_fn(...args) { calls.push(args); }
    g.set_line_fn(line_fn);
    g.forward(50);
    t.equal(calls.length, 1, 'forward calls line_fn once');
    t.match(calls.pop(), [0,0,0,-50], 'correct call');
    g.right(90);
    g.back(50);
    t.equal(calls.length, 1, 'back calls line_fn once');
    t.match(calls.pop(), [0,-50,-50,-50], 'correct call');
});

tap.test('reset', async t => {
    const g = tg.make_turtle_graphics();
    const initial_state = JSON.parse(JSON.stringify(g.state())); // copy initial state
    // do stuff
    g.scale(2,2);
    g.rotate(45);
    g.translate(10, 10);
    g.forward(50);
    g.right(50);
    g.penup();
    t.notMatch(g.state(), initial_state, 'state has changed');
    g.reset();
    t.match(g.state(), initial_state, 'back to original state');
});

tap.test('push_turtle / pop_turtle', async t => {
    const g = tg.make_turtle_graphics();
    const state0 = JSON.parse(JSON.stringify(g.state())); // copy initial state
    g.push_turtle();
    t.equal(g.state().turtle_stack.length, 1, 'stack length 1');
    // do stuff
    g.forward(50);
    g.right(50);
    g.penup();
    const state1 = JSON.parse(JSON.stringify(g.state()));
    g.push_turtle();
    t.equal(g.state().turtle_stack.length, 2, 'stack length 2');
    g.pendown();
    g.left(100);
    g.back(100);
    const state2 = JSON.parse(JSON.stringify(g.state()));
    t.notMatch(g.state().turtle, state1.turtle, 'turtle changed (1/2)');
    t.notMatch(g.state().turtle, state0.turtle, 'turtle changed (2/2)');
    t.match(g.state().matrix, state1.matrix, 'matrix unchanged (1/2)');
    t.match(g.state().matrix, state0.matrix, 'matrix unchanged (1/2)');
    
    g.pop_turtle();
    t.match(g.state(), state1, 'back to state 1');
    g.pop_turtle();
    t.match(g.state(), state0, 'back to state 0');
    g.pop_turtle();
    t.match(g.state(), state0, 'still at state 0');
});

tap.test('push_matrix / pop_matrix', async t => {
    const g = tg.make_turtle_graphics();
    const state0 = JSON.parse(JSON.stringify(g.state())); // copy initial state
    g.push_matrix();
    t.equal(g.state().matrix_stack.length, 1, 'stack length 1');
    // do stuff
    g.translate(10, 10);
    const state1 = JSON.parse(JSON.stringify(g.state()));
    g.push_matrix();
    t.equal(g.state().matrix_stack.length, 2, 'stack length 2');
    g.translate(10, 10);
    const state2 = JSON.parse(JSON.stringify(g.state()));
    t.notMatch(g.state().matrix, state1.matrix, 'matrix changed (1/2)');
    t.notMatch(g.state().matrix, state0.matrix, 'matrix changed (1/2)');
    t.match(g.state().turtle, state1.turtle, 'turtle unchanged (1/2)');
    t.match(g.state().turtle, state0.turtle, 'turtle unchanged (2/2)');

    g.pop_matrix();
    t.match(g.state(), state1, 'back to state 1');
    g.pop_matrix();
    t.match(g.state(), state0, 'back to state 0');
    g.pop_matrix();
    t.match(g.state(), state0, 'still at state 0');
});

tap.test('push / pop', async t => {
    const g = tg.make_turtle_graphics();
    const state0 = JSON.parse(JSON.stringify(g.state())); // copy initial state
    g.push();
    t.equal(g.state().matrix_stack.length, 1, 'stack length 1');
    // do stuff
    g.translate(10, 10);
    g.forward(50);
    const state1 = JSON.parse(JSON.stringify(g.state()));
    g.push();
    t.equal(g.state().matrix_stack.length, 2, 'stack length 2');
    g.rotate(45);
    g.right(90);
    const state2 = JSON.parse(JSON.stringify(g.state()));
    t.notMatch(g.state().turtle, state1.turtle, 'turtle changed (1/2)');
    t.notMatch(g.state().turtle, state0.turtle, 'turtle changed (2/2)');
    t.notMatch(g.state().matrix, state1.matrix, 'matrix changed (1/2)');
    t.notMatch(g.state().matrix, state0.matrix, 'matrix changed (1/2)');

    g.pop();
    t.match(g.state(), state1, 'back to state 1');
    g.pop();
    t.match(g.state(), state0, 'back to state 0');
    g.pop();
    t.match(g.state(), state0, 'still at state 0');
});

tap.test('turtle', async t => {
    let g = tg.make_turtle_graphics();
    // do stuff
    g.scale(2,2);
    g.rotate(45);
    g.translate(10, 10);
    g.forward(50);
    g.right(50);
    g.penup();
    const state_before_turtle = JSON.parse(JSON.stringify(g.state())); // copy state
    g.turtle();
    t.match(g.state(), state_before_turtle, 'state is unchanged');
});

tap.test('repeat', async t => {
    const g = tg.make_turtle_graphics();
    let calls = [];
    function fn(...args) { calls.push(args); }
    g.repeat(8, fn);
    t.equal(calls.length, 8, 'calls 8 times');
    const args = [...Array(8).keys()].map( (e, i) => { return [i]; } );
    t.same(calls, args, 'calls with iteration index');
});

tap.test('setxy', async t => {
    let g, state;
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state())); // copy state
    g.setxy(100, 50);
    state.turtle.x = state.turtle.ux = 100;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'only x and y changed');
    g.setxy();
    state.turtle.px = 100;
    state.turtle.py = 50;
    t.match(g.state(), state, 'both arguments undefined');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state())); // copy state
    g.setxy(100);
    state.turtle.x = state.turtle.ux = 100;
    t.match(g.state(), state, 'only x given');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state())); // copy state
    g.setxy(undefined, 50);
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'only y given');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state())); // copy state
    g.setxy( {x:100, y:50}, 999 );
    state.turtle.x = state.turtle.ux = 100;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'object arg');
    g.setxy({z:99}, 999);
    state.turtle.px = 100;
    state.turtle.py = 50;
    t.match(g.state(), state, 'object arg: both arguments undefined');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state())); // copy state
    g.setxy({x:100, z:99}, 999);
    state.turtle.x = state.turtle.ux = 100;
    t.match(g.state(), state, 'object arg: only x given');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state())); // copy state
    g.setxy({y:50, z:99}, 999);
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'object arg: only y given');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state())); // copy state
    g.setxy( [100, 50, 99], 999 );
    state.turtle.x = state.turtle.ux = 100;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'array arg');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state())); // copy state
    g.setxy([100], 999);
    state.turtle.x = state.turtle.ux = 100;
    t.match(g.state(), state, 'array arg: only x given');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state())); // copy state
    g.setxy([undefined, 50]), 999;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'array arg: only y given');
});
