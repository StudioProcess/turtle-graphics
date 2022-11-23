import tap from 'tap';
import * as tg from './tg.mjs';

// console.log(tap);
// console.log(tg);

// TODO:
// * _add_line_fn
// * _rm_line_fn
// * range

// Copy everythig from g._state() except line_fns
function copy_state(g) {
    return JSON.parse( JSON.stringify(g._state(), (k, v) => k !== 'line_fns' ? v : undefined) );
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
    delete g.VERSION; // VERSION is excepted from globalize
    for (let key of Object.keys(g)) { // System properties like _globalized are excepted as well
        if ( key.startsWith('_') ) { delete g[key]; }
    }
    t.match(obj, g, 'global object has turtle properties now');
});

tap.test('_state', async t => {
    const g = tg.make_turtle_graphics();
    const s = g._state();
    t.hasProps(g._state(), ['turtle', 'turtle_stack', 'matrix', 'matrix_stack']);
});

tap.test('forward', async t => {
    const g = tg.make_turtle_graphics();
    t.match(g._state().turtle, { x:0, y:0, a:0 });
    g.forward(100);
    t.match(g._state().turtle, { x:0, y:-100, a:0 });
    g.forward(50);
    t.match(g._state().turtle, { x:0, y:-150, a:0 });
    g.forward(25);
    t.match(g._state().turtle, { x:0, y:-175, a:0 });
    g.forward(0);
    t.match(g._state().turtle, { x:0, y:-175, a:0 });
    g.forward();
    t.match(g._state().turtle, { x:0, y:-275, a:0 });
    g.forward(-275);
    t.match(g._state().turtle, { x:0, y:0, a:0 });
});

tap.test('back', async t => {
    const g = tg.make_turtle_graphics();
    t.match(g._state().turtle, { x:0, y:0, a:0 });
    g.back(100);
    t.match(g._state().turtle, { x:0, y:100, a:0 });
    g.back(50);
    t.match(g._state().turtle, { x:0, y:150, a:0 });
    g.back(25);
    t.match(g._state().turtle, { x:0, y:175, a:0 });
    g.back(0);
    t.match(g._state().turtle, { x:0, y:175, a:0 });
    g.back();
    t.match(g._state().turtle, { x:0, y:275, a:0 });
    g.back(-275);
    t.match(g._state().turtle, { x:0, y:0, a:0 });
});

tap.test('right', async t => {
    const g = tg.make_turtle_graphics();
    g.right(90);
    t.match(g._state().turtle, { x:0, y:0, a:90 });
    g.right(90);
    t.match(g._state().turtle, { x:0, y:0, a:180 });
    g.right(90);
    t.match(g._state().turtle, { x:0, y:0, a:270 });
    g.right(90);
    t.match(g._state().turtle, { x:0, y:0, a:0 });
    g.right(0);
    t.match(g._state().turtle, { x:0, y:0, a:0 });
    g.right();
    t.match(g._state().turtle, { x:0, y:0, a:90 });
    g.right(-90);
    t.match(g._state().turtle, { x:0, y:0, a:0 });
    g.right(-370);
    t.match(g._state().turtle, { x:0, y:0, a:350 });
});

tap.test('left', async t => {
    const g = tg.make_turtle_graphics();
    g.left(90);
    t.match(g._state().turtle, { x:0, y:0, a:270 });
    g.left(90);
    t.match(g._state().turtle, { x:0, y:0, a:180 });
    g.left(90);
    t.match(g._state().turtle, { x:0, y:0, a:90 });
    g.left(90);
    t.match(g._state().turtle, { x:0, y:0, a:0 });
    g.left(0);
    t.match(g._state().turtle, { x:0, y:0, a:0 });
    g.left();
    t.match(g._state().turtle, { x:0, y:0, a:270 });
    g.left(-90);
    t.match(g._state().turtle, { x:0, y:0, a:0 });
    g.left(-370);
    t.match(g._state().turtle, { x:0, y:0, a:10 });
});

tap.test('square movement', async t => {
    const g = tg.make_turtle_graphics();
    g.forward(100);
    t.match(g._state().turtle, { x:0, y:-100, a:0 });
    g.right(90);
    t.match(g._state().turtle, { x:0, y:-100, a:90 });
    g.forward(100);
    t.match(g._state().turtle, { x:100, y:-100, a:90 });
    g.right(90);
    t.match(g._state().turtle, { x:100, y:-100, a:180 });
    g.forward(100);
    t.match(g._state().turtle, { x:100, y:0, a:180 });
    g.right(90);
    t.match(g._state().turtle, { x:100, y:0, a:270 });
    g.forward(100);
    t.match(g._state().turtle, { x:0, y:0, a:270 });
    g.right(90);
    t.match(g._state().turtle, { x:0, y:0, a:0 });
});

tap.test('pen', async t => {
    const g = tg.make_turtle_graphics();
    t.match(g._state().turtle, { d:true });
    g.pendown();
    t.match(g._state().turtle, { d:true });
    g.penup();
    t.match(g._state().turtle, { d:false });
    g.penup();
    t.match(g._state().turtle, { d:false });
    // TODO: test line_fn not being called with penup
});

tap.test('translate', async t => {
    const g = tg.make_turtle_graphics();
    g.translate(100, 50);
    t.match(g._state().turtle, { x:0, y:0, a:0 }, 'no immediate change');
    g.forward(0);
    t.match(g._state().turtle, { x:100, y:50, a:0 });
    g.forward(0);
    t.match(g._state().turtle, { x:100, y:50, a:0 });
    
    g.translate();
    g.forward(0);
    t.match(g._state().turtle, { x:100, y:50, a:0 }, 'no argument');
    g.translate(10);
    g.forward(0);
    t.match(g._state().turtle, { x:110, y:50, a:0 }, 'single argument');
    g.translate(-110, 50);
    g.forward(100);
    t.match(g._state().turtle, { x:0, y:0, a:0 });
});

tap.test('rotate', async t => {
    const g = tg.make_turtle_graphics();
    g.rotate(90);
    g.forward(100);
    t.match(g._state().turtle, { x:100, y:0, a:90 });
    g.right(90);
    t.match(g._state().turtle, { x:100, y:0, a:180 });
    g.forward(100);
    t.match(g._state().turtle, { x:100, y:100, a:180 });
    g.rotate(-90);
    g.forward(0);
    t.match(g._state().turtle, { x:100, y:-100, a:90 });
    g.rotate();
    g.forward(0);
    t.match(g._state().turtle, { x:100, y:-100, a:90 }, 'no argument');
});

tap.test('scale', async t => {
    let g;
    g = tg.make_turtle_graphics();
    g.scale(2, 2);
    g.forward(0);
    t.match(g._state().turtle, { x:0, y:0, a:0 }, 'in origin');
    g.forward(100);
    t.match(g._state().turtle, { x:0, y:-200, a:0 });
    g.right(90);
    g.forward(100);
    t.match(g._state().turtle, { x:200, y:-200, a:90 });
    g.scale(1, 1);
    g.forward(0);
    t.match(g._state().turtle, { x:200, y:-200, a:90 });
    g.scale(0.5, 0.5);
    g.forward(0);
    t.match(g._state().turtle, { x:100, y:-100, a:90 });
    g = tg.make_turtle_graphics();
    g.scale(2, 0.5);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g._state().turtle, { x:200, y:-50, a:90 }, 'differing arguments');
    g = tg.make_turtle_graphics();
    g.scale(2);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g._state().turtle, { x:200, y:-200, a:90 }, 'single argument');
    g = tg.make_turtle_graphics();
    g.scale();
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g._state().turtle, { x:100, y:-100, a:90 }, 'no argument');
});

tap.test('compound transformations', async t => {
    let g;
    g = tg.make_turtle_graphics();
    g.scale(2, 0.5);
    g.translate(100, 50);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g._state().turtle, { x:400, y:-25, a:90 }, 'S/T');
    
    g = tg.make_turtle_graphics();
    g.translate(100, 50);
    g.scale(2, 0.5);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g._state().turtle, { x:300, y:0, a:90 }, 'T/S');
    
    g = tg.make_turtle_graphics();
    g.scale(2, 0.5);
    g.rotate(90);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g._state().turtle, { x:200, y:50, a:180 }, 'S/R'); // weird, but confirmed with p5
    
    g = tg.make_turtle_graphics();
    g.rotate(90);
    g.scale(2, 0.5);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g._state().turtle, { x:50, y:200, a:180 }, 'R/S'); // confirmed with p5
    
    g = tg.make_turtle_graphics();
    g.rotate(90);
    g.translate(100, 50);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g._state().turtle, { x:50, y:200, a:180 }, 'R/T'); // confirmed with p5
    
    g = tg.make_turtle_graphics();
    g.translate(100, 50);
    g.rotate(90);
    g.forward(0);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g._state().turtle, { x:200, y:150, a:180 }, 'T/R'); // confirmed with p5
});

tap.test('_add_line_fn', async t => {
    const g = tg.make_turtle_graphics();
    let calls = [];
    function line_fn(...args) { calls.push(args); }
    g._add_line_fn(line_fn);
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
    t.notMatch(g._state(), initial_state, 'state has changed');
    g.reset();
    t.match(g._state(), initial_state, 'back to original state');
});

tap.test('pushstate / popstate', async t => {
    const g = tg.make_turtle_graphics();
    const state0 = copy_state(g); // copy initial state
    g.pushstate();
    t.equal(g._state().turtle_stack.length, 1, 'stack length 1');
    // do stuff
    g.forward(50);
    g.right(50);
    g.penup();
    const state1 = copy_state(g);
    g.pushstate();
    t.equal(g._state().turtle_stack.length, 2, 'stack length 2');
    g.pendown();
    g.left(100);
    g.back(100);
    const state2 = copy_state(g);
    t.notMatch(g._state().turtle, state1.turtle, 'turtle changed (1/2)');
    t.notMatch(g._state().turtle, state0.turtle, 'turtle changed (2/2)');
    t.match(g._state().matrix, state1.matrix, 'matrix unchanged (1/2)');
    t.match(g._state().matrix, state0.matrix, 'matrix unchanged (1/2)');
    
    g.popstate();
    t.match(g._state(), state1, 'back to state 1');
    g.popstate();
    t.match(g._state(), state0, 'back to state 0');
    g.popstate();
    t.match(g._state(), state0, 'still at state 0');
});

tap.test('pushmatrix / popmatrix', async t => {
    const g = tg.make_turtle_graphics();
    const state0 = copy_state(g); // copy initial state
    g.pushmatrix();
    t.equal(g._state().matrix_stack.length, 1, 'stack length 1');
    // do stuff
    g.translate(10, 10);
    const state1 = copy_state(g);
    g.pushmatrix();
    t.equal(g._state().matrix_stack.length, 2, 'stack length 2');
    g.translate(10, 10);
    const state2 = copy_state(g);
    t.notMatch(g._state().matrix, state1.matrix, 'matrix changed (1/2)');
    t.notMatch(g._state().matrix, state0.matrix, 'matrix changed (1/2)');
    t.match(g._state().turtle, state1.turtle, 'turtle unchanged (1/2)');
    t.match(g._state().turtle, state0.turtle, 'turtle unchanged (2/2)');

    g.popmatrix();
    t.match(g._state(), state1, 'back to state 1');
    g.popmatrix();
    t.match(g._state(), state0, 'back to state 0');
    g.popmatrix();
    t.match(g._state(), state0, 'still at state 0');
});

tap.test('push / pop', async t => {
    const g = tg.make_turtle_graphics();
    const state0 = copy_state(g); // copy initial state
    g.push();
    t.equal(g._state().matrix_stack.length, 1, 'stack length 1');
    // do stuff
    g.translate(10, 10);
    g.forward(50);
    const state1 = copy_state(g);
    g.push();
    t.equal(g._state().matrix_stack.length, 2, 'stack length 2');
    g.rotate(45);
    g.right(90);
    const state2 = copy_state(g);
    t.notMatch(g._state().turtle, state1.turtle, 'turtle changed (1/2)');
    t.notMatch(g._state().turtle, state0.turtle, 'turtle changed (2/2)');
    t.notMatch(g._state().matrix, state1.matrix, 'matrix changed (1/2)');
    t.notMatch(g._state().matrix, state0.matrix, 'matrix changed (1/2)');

    g.pop();
    t.match(g._state(), state1, 'back to state 1');
    g.pop();
    t.match(g._state(), state0, 'back to state 0');
    g.pop();
    t.match(g._state(), state0, 'still at state 0');
});

tap.test('show', async t => {
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
    g._add_line_fn(line_fn);
    t.ok(n === 0, 'no drawing up until now');
    g.show();
    t.match(g._state(), state_before_turtle, 'state is unchanged');
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
    g._add_line_fn(line_fn);
    t.ok(n === 0, 'no drawing up until now');
    g.mark();
    t.match(g._state(), state_before_turtle, 'state is unchanged after mark');
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
    // Test return value
    let res = g.repeat(3, () => {});
    t.equal(res, undefined, 'return value when fn doesn\'t return anything');
    res = g.repeat(3, i => i);
    t.match(res, [0,1,2], 'return interation index');
    res = g.repeat(3, i => i === 2 ? true : undefined);
    t.match(res, [undefined, undefined, true], 'partial return');
    res = g.repeat(3, () => undefined);
    t.equal(res, undefined, 'explicit undefined');
});

tap.test('xy', async t => {
    let g = tg.make_turtle_graphics();
    t.match(g.xy(), {x:0, y:0});
    g.forward(100);
    t.match(g.xy(), {x:0, y:-100});
    g.right(90);
    t.match(g.xy(), {x:0, y:-100});
    g.forward(50);
    t.match(g.xy(), {x:50, y:-100});
    g.setxy(123, 456);
    t.match(g.xy(), {x:123, y:456});
    g.jumpxy(789, 12);
    t.match(g.xy(), {x:789, y:12});    
    t.match(g.xy(), {x: g._state().turtle.x, y: g._state().turtle.y});
});

tap.test('setxy', async t => {
    let g, state;
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy(100, 50);
    state.turtle.x = state.turtle.ux = 100;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g._state(), state, 'only x and y changed');
    g.setxy();
    state.turtle.px = state.turtle.upx = 100;
    state.turtle.py = state.turtle.upy = 50;
    t.match(g._state(), state, 'both arguments undefined');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy(100);
    state.turtle.x = state.turtle.ux = 100;
    t.match(g._state(), state, 'only x given');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy(undefined, 50);
    state.turtle.y = state.turtle.uy = 50;
    t.match(g._state(), state, 'only y given');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy(null, 50);
    state.turtle.y = state.turtle.uy = 50;
    t.match(g._state(), state, 'only y given (null)');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy( {x:100, y:50}, 999 );
    state.turtle.x = state.turtle.ux = 100;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g._state(), state, 'object arg');
    g.setxy({z:99}, 999);
    state.turtle.px = state.turtle.upx = 100;
    state.turtle.py = state.turtle.upy = 50;
    t.match(g._state(), state, 'object arg: both arguments undefined');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy({x:100, z:99}, 999);
    state.turtle.x = state.turtle.ux = 100;
    t.match(g._state(), state, 'object arg: only x given');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy({y:50, z:99}, 999);
    state.turtle.y = state.turtle.uy = 50;
    t.match(g._state(), state, 'object arg: only y given');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy( [100, 50, 99], 999 );
    state.turtle.x = state.turtle.ux = 100;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g._state(), state, 'array arg');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy([100], 999);
    state.turtle.x = state.turtle.ux = 100;
    t.match(g._state(), state, 'array arg: only x given');
    
    g = tg.make_turtle_graphics();
    state = copy_state(g); // copy state
    g.setxy([undefined, 50]), 999;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g._state(), state, 'array arg: only y given');
});

tap.test('jumpxy', async t => {
    let n = 0;
    function line_fn() { n += 1; }
    let g, state;
    g = tg.make_turtle_graphics();
    g._add_line_fn(line_fn);
    state = copy_state(g);
    g.jumpxy(100, 50);
    state.turtle.x = state.turtle.ux = 100;
    state.turtle.y = state.turtle.uy = 50;
    t.match(g._state(), state, 'only x and y changed');
    t.equal(n, 0, 'no lines drawn');
});

tap.test('setheading', async t => {
    const g = tg.make_turtle_graphics();
    const state = copy_state(g); // copy state
    g.setheading(100);
    state.turtle.a = state.turtle.ua = 100;
    t.match(g._state(), state, 'only angle changed');
});

tap.test('x/y', async t => {
    const g = tg.make_turtle_graphics();
    g.forward(100);
    g.right(90);
    g.forward(50);
    t.equal(g.x(), g._state().turtle.x, 'xcor');
    t.equal(g.x(), 50, 'xcor');
    t.equal(g.y(), g._state().turtle.y, 'ycor');
    t.equal(g.y(), -100, 'ycor');
});

tap.test('heading', async t => {
    const g = tg.make_turtle_graphics();
    g.right(45);
    t.equal(g.heading(), g._state().turtle.a, 'heading');
    t.equal(g.heading(), 45, 'heading');
    g.right(180);
    t.equal(g.heading(), g._state().turtle.a, 'heading (2)');
    t.equal(g.heading(), 225, 'heading (2)');
    g.right(135);
    t.equal(g.heading(), g._state().turtle.a, 'heading (3)');
    t.equal(g.heading(), 0, 'heading (3)');
});

tap.test('isdown/isup', async t => {
    const g = tg.make_turtle_graphics();
    t.equal(g.isdown(), g._state().turtle.d, 'isdown');
    t.equal(g.isdown(), true, 'isdown');
    t.equal(g.isup(), !g._state().turtle.d, 'isup');
    t.equal(g.isup(), false, 'isup');
    g.penup();
    t.equal(g.isdown(), g._state().turtle.d, 'isdown (2)');
    t.equal(g.isdown(), false, 'isdown (2)');
    t.equal(g.isup(), !g._state().turtle.d, 'isup (2)');
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
    t.equal(g._state().turtle.a, 0, 'face (0)');
    g.face(100, -100);
    t.equal(g._state().turtle.a, 45, 'face (1)');
    g.face(100, 0);
    t.equal(g._state().turtle.a, 90, 'face (2)');
    g.face(100, 100);
    t.equal(g._state().turtle.a, 135, 'face (3)');
    g.face(0, 100);
    t.equal(g._state().turtle.a, 180, 'face (4)');
    g.face(-100, 100);
    t.equal(g._state().turtle.a, 225, 'face (5)');
    g.face(-100, 0);
    t.equal(g._state().turtle.a, 270, 'face (6)');
    g.face(-100, -100);
    t.equal(g._state().turtle.a, 315, 'face (7)');
    g.face(0, -100);
});

tap.test('state', async t => {
    const g = tg.make_turtle_graphics();
    // do some stuff
    g.scale(2,2);
    g.rotate(45);
    g.translate(10, 10);
    g.forward(50);
    g.right(50);
    g.penup();
    const x = g.state();
    const x_copy = JSON.parse(JSON.stringify(x));
    t.match(g._state().turtle, x, 'state matches current internal state');
    // do more stuff
    g.scale(2,2);
    g.rotate(45);
    g.translate(10, 10);
    g.forward(50);
    g.right(50);
    g.pendown();
    const y = g.state();
    t.match(x, x_copy, 'old state is unchanged');
    t.not(y, x, 'new state returns new object');
    t.match(g._state().turtle, y, 'new state matches current internal state');
});

tap.test('setstate', async t => {
    let o = { x:10, y:20, a:30, d:false };
    let g, state;
    
    g = tg.make_turtle_graphics();
    g.setstate(o.x, o.y, o.a, o.d, 99);
    t.match(g._state().turtle, o, 'setstate with all arguments');
    
    g = tg.make_turtle_graphics();
    g.setstate([o.x, o.y, o.a, o.d], 99, 99, 99, 99);
    t.match(g._state().turtle, o, 'setstate with array argument');
    
    g = tg.make_turtle_graphics();
    g.setstate(o, 99, 99, 99, 99);
    t.match(g._state().turtle, o, 'setstate with object argument');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g._state().turtle));
    g.setstate(o.x);
    t.match(g._state().turtle, {x:o.x, y:state.y, a:state.a, d:state.d}, 'set only x');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g._state().turtle));
    g.setstate(undefined, o.y);
    t.match(g._state().turtle, {x:state.x, y:o.y, a:state.a, d:state.d}, 'set only y');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g._state().turtle));
    g.setstate(undefined, undefined, o.a);
    t.match(g._state().turtle, {x:state.x, y:state.y, a:o.a, d:state.d}, 'set only a');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g._state().turtle));
    g.setstate(undefined, undefined, undefined, o.d);
    t.match(g._state().turtle, {x:state.x, y:state.y, a:state.a, d:o.d}, 'set only d');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g._state().turtle));
    g.setstate(null, o.y);
    t.match(g._state().turtle, {x:state.x, y:o.y, a:state.a, d:state.d}, 'set only y (null)');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g._state().turtle));
    g.setstate(null, null, o.a);
    t.match(g._state().turtle, {x:state.x, y:state.y, a:o.a, d:state.d}, 'set only a (null)');
    
    g = tg.make_turtle_graphics();
    state = JSON.parse(JSON.stringify(g._state().turtle));
    g.setstate(null, null, null, o.d);
    t.match(g._state().turtle, {x:state.x, y:state.y, a:state.a, d:o.d}, 'set only d (null)');
});

tap.test('newturtle', async t => {
    const g = tg.make_turtle_graphics();
    let n = 0;
    function line_fn() { n += 1; }
    g._add_line_fn(line_fn);
    
    const t1 = g.newturtle();
    t.not(t1, g, 'not the old instance (t1)');
    t.equal(t1._state().line_fns[0], line_fn, 'same line_fn (t1)');
    
    function line_fn2() {}
    const t2 = g.newturtle(line_fn2);
    t.not(t2, g, 'not the old instance (t2)');
    t.equal(t2._state().line_fns[0], line_fn2, 'own line_fn (t2)');
});

tap.test('self', async t => {
    const g = tg.make_turtle_graphics();
    t.equal(g.self(), g, 'self equals the original instance')
});

tap.test('clone', async t => {
    const g = tg.make_turtle_graphics();
    // modify state
    g._add_line_fn(x => {});
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
    t.not(c._state().turtle, g._state().turtle, 'turtle state different object');
    t.not(c._state().turtle_stack, g._state().turtle_stack, 'turtle stack different object');
    t.not(c._state().matrix, g._state().matrix, 'matrix different object');
    t.not(c._state().matrix_stack, g._state().matrix_stack, 'matrix stack different object');
    // same content
    t.same(c._state().turtle, g._state().turtle, 'turtle state same content');
    t.same(c._state().matrix, g._state().matrix, 'matrix same content');
    // stacks
    t.equal(c._state().turtle_stack.length, g._state().turtle_stack.length, 'stack lengths equal (turtle)');
    t.equal(c._state().matrix_stack.length, g._state().matrix_stack.length, 'stack lengths equal (matrix)');
    for (let i=0; i<c._state().turtle_stack.length; i++) {
        t.not(c._state().turtle_stack[i], g._state().turtle_stack[i], `turtle stack objects different (${i})`);
        t.same(c._state().turtle_stack[i], g._state().turtle_stack[i], `turtle stack contents same (${i})`);
    }
    for (let i=0; i<c._state().matrix_stack.length; i++) {
        t.not(c._state().matrix_stack[i], g._state().matrix_stack[i], `matrix stack objects different (${i})`);
        t.same(c._state().matrix_stack[i], g._state().matrix_stack[i], `matrix stack contents same (${i})`);
    }
    t.equal(c._state().line_fn, g._state().line_fn, 'line_fn equal')
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

tap.test('type', async t => {
    let g = tg.make_turtle_graphics();
    t.equal(g.type(10), 'number');
    t.equal(g.type(NaN), 'number');
    t.equal(g.type(Infinity), 'number');
    t.equal(g.type('10'), 'string');
    t.equal(g.type(true), 'boolean');
    t.equal(g.type(false), 'boolean');
    t.equal(g.type(1 === 1), 'boolean');
    t.equal(g.type(1 !== 1), 'boolean');
    t.equal(g.type(function() {}), 'function');
    t.equal(g.type(() => {}), 'function');
    t.equal(g.type([]), 'array');
    t.equal(g.type({}), 'object');
    t.equal(g.type(globalThis), 'object');
    t.equal(g.type(undefined), 'undefined');
    t.equal(g.type(), 'undefined');
    t.equal(g.type(null), 'null');
});
