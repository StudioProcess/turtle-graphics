import tap from 'tap';
import * as tg from './tg.mjs';

// console.log(tap);
// console.log(tg);

// TODO: 
// * add_line_fn
// * rm_line_fn

// Copy everythig from g.state() except line_fns
function copy_state(g) {
    return JSON.parse( JSON.stringify(g.state(), (k, v) => k !== 'line_fns' ? v : undefined) );
}

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
    const initial_state = copy_state(g); // copy initial state
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
    const state0 = copy_state(g); // copy initial state
    g.push_turtle();
    t.equal(g.state().turtle_stack.length, 1, 'stack length 1');
    // do stuff
    g.forward(50);
    g.right(50);
    g.penup();
    const state1 = copy_state(g);
    g.push_turtle();
    t.equal(g.state().turtle_stack.length, 2, 'stack length 2');
    g.pendown();
    g.left(100);
    g.back(100);
    const state2 = copy_state(g);
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
    const state0 = copy_state(g); // copy initial state
    g.push_matrix();
    t.equal(g.state().matrix_stack.length, 1, 'stack length 1');
    // do stuff
    g.translate(10, 10);
    const state1 = copy_state(g);
    g.push_matrix();
    t.equal(g.state().matrix_stack.length, 2, 'stack length 2');
    g.translate(10, 10);
    const state2 = copy_state(g);
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
    const state0 = copy_state(g); // copy initial state
    g.push();
    t.equal(g.state().matrix_stack.length, 1, 'stack length 1');
    // do stuff
    g.translate(10, 10);
    g.forward(50);
    const state1 = copy_state(g);
    g.push();
    t.equal(g.state().matrix_stack.length, 2, 'stack length 2');
    g.rotate(45);
    g.right(90);
    const state2 = copy_state(g);
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
    const g = tg.make_turtle_graphics();
    let n = 0;
    function line_fn() { n += 1; }
    // do stuff
    g.scale(2,2);
    g.rotate(45);
    g.translate(10, 10);
    g.forward(50);
    g.right(50);
    g.penup();
    const state_before_turtle = copy_state(g); // copy state
    g.set_line_fn(line_fn);
    t.ok(n === 0, 'no drawing up until now');
    g.turtle();
    t.match(g.state(), state_before_turtle, 'state is unchanged');
    t.ok(n > 1, 'turtle did some drawing');
});

tap.test('mark', async t => {
    const g = tg.make_turtle_graphics();
    let n = 0;
    function line_fn() { n += 1; }
    // do stuff
    g.scale(2,2);
    g.rotate(45);
    g.translate(10, 10);
    g.back(50);
    g.left(50);
    g.penup();
    const state_before_turtle = copy_state(g); // copy state
    g.set_line_fn(line_fn);
    t.ok(n === 0, 'no drawing up until now');
    g.mark();
    t.match(g.state(), state_before_turtle, 'state is unchanged after mark');
    t.ok(n > 1, 'mark did some drawing');
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
    state = copy_state(g); // copy state
    g.setxy(100, 50);
    state.turtle.x = state.turtle.ux = 100;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'only x and y changed');
    g.setxy();
    state.turtle.px = state.turtle.upx = 100;
    state.turtle.py = state.turtle.upy = 50;
    t.match(g.state(), state, 'both arguments undefined');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy(100);
    state.turtle.x = state.turtle.ux = 100;
    t.match(g.state(), state, 'only x given');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy(undefined, 50);
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'only y given');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy(null, 50);
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'only y given (null)');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy( {x:100, y:50}, 999 );
    state.turtle.x = state.turtle.ux = 100;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'object arg');
    g.setxy({z:99}, 999);
    state.turtle.px = state.turtle.upx = 100;
    state.turtle.py = state.turtle.upy = 50;
    t.match(g.state(), state, 'object arg: both arguments undefined');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy({x:100, z:99}, 999);
    state.turtle.x = state.turtle.ux = 100;
    t.match(g.state(), state, 'object arg: only x given');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy({y:50, z:99}, 999);
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'object arg: only y given');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy( [100, 50, 99], 999 );
    state.turtle.x = state.turtle.ux = 100;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'array arg');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy([100], 999);
    state.turtle.x = state.turtle.ux = 100;
    t.match(g.state(), state, 'array arg: only x given');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy([undefined, 50]), 999;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'array arg: only y given');
});

tap.test('jumpxy', async t => {
    let n = 0;
    function line_fn() { n += 1; }
    let g, state;
    g = tg.make_turtle_graphics();
    g.set_line_fn(line_fn);
    state = copy_state(g);
    g.jumpxy(100, 50);
    state.turtle.x = state.turtle.ux = 100;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g.state(), state, 'only x and y changed');
    t.equal(n, 0, 'no lines drawn');
});

tap.test('setheading', async t => {
    const g = tg.make_turtle_graphics();
    const state = copy_state(g); // copy state
    g.setheading(100);
    state.turtle.a = state.turtle.ua = 100;
    t.match(g.state(), state, 'only angle changed');
});

tap.test('xor/ycor', async t => {
    const g = tg.make_turtle_graphics();
    g.forward(100);
    g.right(90);
    g.forward(50);
    t.equal(g.xcor(), g.state().turtle.x, 'xcor');
    t.equal(g.xcor(), 50, 'xcor');
    t.equal(g.ycor(), g.state().turtle.y, 'ycor');
    t.equal(g.ycor(), -100, 'ycor');
});

tap.test('heading', async t => {
    const g = tg.make_turtle_graphics();
    g.right(45);
    t.equal(g.heading(), g.state().turtle.a, 'heading');
    t.equal(g.heading(), 45, 'heading');
    g.right(180);
    t.equal(g.heading(), g.state().turtle.a, 'heading (2)');
    t.equal(g.heading(), 225, 'heading (2)');
    g.right(135);
    t.equal(g.heading(), g.state().turtle.a, 'heading (3)');
    t.equal(g.heading(), 0, 'heading (3)');
});

tap.test('isdown/isup', async t => {
    const g = tg.make_turtle_graphics();
    t.equal(g.isdown(), g.state().turtle.d, 'isdown');
    t.equal(g.isdown(), true, 'isdown');
    t.equal(g.isup(), !g.state().turtle.d, 'isup');
    t.equal(g.isup(), false, 'isup');
    g.penup();
    t.equal(g.isdown(), g.state().turtle.d, 'isdown (2)');
    t.equal(g.isdown(), false, 'isdown (2)');
    t.equal(g.isup(), !g.state().turtle.d, 'isup (2)');
    t.equal(g.isup(), true, 'isup (2)');
});

tap.test('bearing', async t => {
    const g = tg.make_turtle_graphics();
    t.equal(g.bearing(0, 0), 0, 'bearing (1)');
    t.equal(g.bearing(0, -100), 0, 'bearing (2)');
    t.equal(g.bearing(100, 0), 90, 'bearing (3)');
    t.equal(g.bearing(0, 100), 180, 'bearing (4)');
    t.equal(g.bearing(-100, 0), 270, 'bearing (5)');
    
    g.left(45);
    t.equal(g.bearing(0, 0), 0, 'bearing (6)');
    t.equal(g.bearing(0, -100), 0+45, 'bearing (7)');
    t.equal(g.bearing(100, 0), 90+45, 'bearing (8)');
    t.equal(g.bearing(0, 100), 180+45, 'bearing (9)');
    t.equal(g.bearing(-100, 0), 270+45, 'bearing (10)');
    
    g.left(45);
    t.equal(g.bearing(0, 0), 0, 'bearing (11)');
    t.equal(g.bearing(0, -100), 0+90, 'bearing (12)');
    t.equal(g.bearing(100, 0), 90+90, 'bearing (13)');
    t.equal(g.bearing(0, 100), 180+90, 'bearing (14)');
    t.equal(g.bearing(-100, 0), (270+90)%360, 'bearing (15)');
    
    g.left(45);
    t.equal(g.bearing(0, 0), 0, 'bearing (11)');
    t.equal(g.bearing(0, -100), 0+135, 'bearing (12)');
    t.equal(g.bearing(100, 0), 90+135, 'bearing (13)');
    t.equal(g.bearing(0, 100), 180+135, 'bearing (14)');
    t.equal(g.bearing(-100, 0), (270+135)%360, 'bearing (15)');
    
    g.left(45);
    t.equal(g.bearing(0, 0), 0, 'bearing (16)');
    t.equal(g.bearing(0, -100), 0+180, 'bearing (17)');
    t.equal(g.bearing(100, 0), 90+180, 'bearing (18)');
    t.equal(g.bearing(0, 100), (180+180)%360, 'bearing (19)');
    t.equal(g.bearing(-100, 0), (270+180)%360, 'bearing (20)');
    
    g.left(45);
    t.equal(g.bearing(0, 0), 0, 'bearing (21)');
    t.equal(g.bearing(0, -100), 0+225, 'bearing (22)');
    t.equal(g.bearing(100, 0), 90+225, 'bearing (23)');
    t.equal(g.bearing(0, 100), (180+225)%360, 'bearing (24)');
    t.equal(g.bearing(-100, 0), (270+225)%360, 'bearing (25)');
    
    g.left(45);
    t.equal(g.bearing(0, 0), 0, 'bearing (26)');
    t.equal(g.bearing(0, -100), 0+270, 'bearing (27)');
    t.equal(g.bearing(100, 0), (90+270)%360, 'bearing (28)');
    t.equal(g.bearing(0, 100), (180+270)%360, 'bearing (29)');
    t.equal(g.bearing(-100, 0), (270+270)%360, 'bearing (30)');
    
    g.left(45);
    t.equal(g.bearing(0, 0), 0, 'bearing (31)');
    t.equal(g.bearing(0, -100), 0+315, 'bearing (32)');
    t.equal(g.bearing(100, 0), (90+315)%360, 'bearing (33)');
    t.equal(g.bearing(0, 100), (180+315)%360, 'bearing (34)');
    t.equal(g.bearing(-100, 0), (270+315)%360, 'bearing (35)');
    
    g.left(45);
    t.equal(g.bearing(0, 0), 0, 'bearing (31)');
    t.equal(g.bearing(0, -100), (0+360)%360, 'bearing (32)');
    t.equal(g.bearing(100, 0), (90+360)%360, 'bearing (33)');
    t.equal(g.bearing(0, 100), (180+360)%360, 'bearing (34)');
    t.equal(g.bearing(-100, 0), (270+360)%360, 'bearing (35)');
    
    // facing up again
    g.forward(100);
    t.equal(g.bearing(0, 0), 180, 'bearing (36)');
    t.equal(g.bearing(0, -100), 0, 'bearing (37)');
    t.equal(g.bearing(100, 0), 135, 'bearing (38)');
    t.equal(g.bearing(0, 100), 180, 'bearing (39)');
    t.equal(g.bearing(-100, 0), 225, 'bearing (40)');
});

tap.test('face', async t => {
    const g = tg.make_turtle_graphics();
    g.face(0,0);
    t.equal(g.state().turtle.a, 0, 'face (0)');
    g.face(100, -100);
    t.equal(g.state().turtle.a, 45, 'face (1)');
    g.face(100, 0);
    t.equal(g.state().turtle.a, 90, 'face (2)');
    g.face(100, 100);
    t.equal(g.state().turtle.a, 135, 'face (3)');
    g.face(0, 100);
    t.equal(g.state().turtle.a, 180, 'face (4)');
    g.face(-100, 100);
    t.equal(g.state().turtle.a, 225, 'face (5)');
    g.face(-100, 0);
    t.equal(g.state().turtle.a, 270, 'face (6)');
    g.face(-100, -100);
    t.equal(g.state().turtle.a, 315, 'face (7)');
    g.face(0, -100);
});

tap.test('getturtle', async t => {
    const g = tg.make_turtle_graphics();
    // do some stuff
    g.scale(2,2);
    g.rotate(45);
    g.translate(10, 10);
    g.forward(50);
    g.right(50);
    g.penup();
    const x = g.getturtle();
    const x_copy = JSON.parse(JSON.stringify(x));
    t.match(g.state().turtle, x, 'getturtle matches current state');
    // do more stuff
    g.scale(2,2);
    g.rotate(45);
    g.translate(10, 10);
    g.forward(50);
    g.right(50);
    g.pendown();
    const y = g.getturtle();
    t.match(x, x_copy, 'old getturtle is unchanged');
    t.not(y, x, 'new getturtle returns new object');
    t.match(g.state().turtle, y, 'new getturtle matches current state');
});

tap.test('setturtle', async t => {
    let o = { x:10, y:20, a:30, d:false };
    let g, state;
    
    g = tg.make_turtle_graphics();
    g.setturtle(o.x, o.y, o.a, o.d, 99);
    t.match(g.state().turtle, o, 'setturtle with all arguments');
    
    g = tg.make_turtle_graphics();
    g.setturtle([o.x, o.y, o.a, o.d], 99, 99, 99, 99);
    t.match(g.state().turtle, o, 'setturtle with array argument');
    
    g = tg.make_turtle_graphics();
    g.setturtle(o, 99, 99, 99, 99);
    t.match(g.state().turtle, o, 'setturtle with object argument');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state().turtle));
    g.setturtle(o.x);
    t.match(g.state().turtle, {x:o.x, y:state.y, a:state.a, d:state.d}, 'set only x');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state().turtle));
    g.setturtle(undefined, o.y);
    t.match(g.state().turtle, {x:state.x, y:o.y, a:state.a, d:state.d}, 'set only y');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state().turtle));
    g.setturtle(undefined, undefined, o.a);
    t.match(g.state().turtle, {x:state.x, y:state.y, a:o.a, d:state.d}, 'set only a');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state().turtle));
    g.setturtle(undefined, undefined, undefined, o.d);
    t.match(g.state().turtle, {x:state.x, y:state.y, a:state.a, d:o.d}, 'set only d');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state().turtle));
    g.setturtle(null, o.y);
    t.match(g.state().turtle, {x:state.x, y:o.y, a:state.a, d:state.d}, 'set only y (null)');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state().turtle));
    g.setturtle(null, null, o.a);
    t.match(g.state().turtle, {x:state.x, y:state.y, a:o.a, d:state.d}, 'set only a (null)');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g.state().turtle));
    g.setturtle(null, null, null, o.d);
    t.match(g.state().turtle, {x:state.x, y:state.y, a:state.a, d:o.d}, 'set only d (null)');
});

tap.test('maketurtle', async t => {
    const g = tg.make_turtle_graphics();
    let n = 0;
    function line_fn() { n += 1; }
    g.set_line_fn(line_fn);
    
    const t1 = g.maketurtle();
    t.not(t1, g, 'not the old instance (t1)');
    t.equal(t1.state().line_fns[0], line_fn, 'same line_fn (t1)');
    
    function line_fn2() {}
    const t2 = g.maketurtle(line_fn2);
    t.not(t2, g, 'not the old instance (t2)');
    t.equal(t2.state().line_fns[0], line_fn2, 'own line_fn (t2)');
});

tap.test('self', async t => {
    const g = tg.make_turtle_graphics();
    t.equal(g.self(), g, 'self equals the original instance')
});

tap.test('clone', async t => {
    const g = tg.make_turtle_graphics();
    // modify state
    g.set_line_fn(x => {});
    g.forward(100);
    g.right(90);
    g.push();
    g.forward(50);
    g.right(45);
    g.penup();
    g.push();
    const c = g.clone();
    t.not(c, g, 'clone is another object');
    // state objects are different
    t.not(c.state().turtle, g.state().turtle, 'turtle state different');
    t.not(c.state().turtle_stack, g.state().turtle_stack, 'turtle stack different');
    t.not(c.state().matrix, g.state().matrix, 'matrix different');
    t.not(c.state().matrix_stack, g.state().matrix_stack, 'matrix stack different');
    // same content
    t.same(c.state().turtle, g.state().turtle, 'turtle state same content');
    t.same(c.state().matrix, g.state().matrix, 'matrix same content');
    // stacks
    t.equal(c.state().turtle_stack.length, g.state().turtle_stack.length, 'stack lengths equal (turtle)');
    t.equal(c.state().matrix_stack.length, g.state().matrix_stack.length, 'stack lengths equal (matrix)');
    for (let i=0; i<c.state().turtle_stack.length; i++) {
        t.not(c.state().turtle_stack[i], g.state().turtle_stack[i], `turtle stack objects different (${i})`);
        t.same(c.state().turtle_stack[i], g.state().turtle_stack[i], `turtle stack contents same (${i})`);
    }
    for (let i=0; i<c.state().matrix_stack.length; i++) {
        t.not(c.state().matrix_stack[i], g.state().matrix_stack[i], `matrix stack objects different (${i})`);
        t.same(c.state().matrix_stack[i], g.state().matrix_stack[i], `matrix stack contents same (${i})`);
    }
    t.equal(c.state().line_fn, g.state().line_fn, 'line_fn equal')
});

tap.test('distance', async t => {
    let g;
    g = tg.make_turtle_graphics();
    g.setxy(50, 100);
    t.equal(g.distance(50, 100), 0, 'distance test 1');
    t.equal(g.distance(150, 100), 100, 'distance test 2');
    t.equal(g.distance(50, 199), 99, 'distance test 3');
    g.scale(2, 1);
    t.equal(g.distance(50, 100), 50, 'scale test 1');
    t.equal(g.distance(150, 100), 250, 'scale test 2');
    t.equal(g.distance(25, 199), 99, 'scale test 3');
    
    g = tg.make_turtle_graphics();
    g.setxy(50, 100);
    g.translate(50, 0);
    t.equal(g.distance(50, 100), 50, 'translate test 1');
    t.equal(g.distance(150, 100), 150, 'translate test 2');
    t.equal(g.distance(0, 100), 0, 'translate test 3');
});