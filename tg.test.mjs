import tap from 'tap';
import * as tg from './tg.mjs';

// console.log(tap);
// console.log(tg);

tap.test('instance creation', async t => {
    const g = tg.make_turtle_graphics();
    t.ok(g, 'non empty object created');
    t.same(g, tg.default, 'instance similar to default instance');
});

tap.test('globalize', async t => {
    const g = tg.make_turtle_graphics();
    const obj = {};
    tg.globalize(g, obj);
    t.same(obj, g, 'global object has properties now');
});

tap.test('forward', async t => {
    const g = tg.make_turtle_graphics();
    t.match(g.state(), { x:0, y:0, a:0 });
    g.forward(100);
    t.match(g.state(), { x:0, y:-100, a:0 });
    g.forward(50);
    t.match(g.state(), { x:0, y:-150, a:0 });
    g.forward(25);
    t.match(g.state(), { x:0, y:-175, a:0 });
    g.forward(0);
    t.match(g.state(), { x:0, y:-175, a:0 });
    g.forward();
    t.match(g.state(), { x:0, y:-275, a:0 });
    g.forward(-275);
    t.match(g.state(), { x:0, y:0, a:0 });
});

tap.test('backward', async t => {
    const g = tg.make_turtle_graphics();
    t.match(g.state(), { x:0, y:0, a:0 });
    g.backward(100);
    t.match(g.state(), { x:0, y:100, a:0 });
    g.backward(50);
    t.match(g.state(), { x:0, y:150, a:0 });
    g.backward(25);
    t.match(g.state(), { x:0, y:175, a:0 });
    g.backward(0);
    t.match(g.state(), { x:0, y:175, a:0 });
    g.backward();
    t.match(g.state(), { x:0, y:275, a:0 });
    g.backward(-275);
    t.match(g.state(), { x:0, y:0, a:0 });
});

tap.test('right', async t => {
    const g = tg.make_turtle_graphics();
    g.right(90);
    t.match(g.state(), { x:0, y:0, a:90 });
    g.right(90);
    t.match(g.state(), { x:0, y:0, a:180 });
    g.right(90);
    t.match(g.state(), { x:0, y:0, a:270 });
    g.right(90);
    t.match(g.state(), { x:0, y:0, a:0 });
    g.right(0);
    t.match(g.state(), { x:0, y:0, a:0 });
    g.right();
    t.match(g.state(), { x:0, y:0, a:90 });
    g.right(-90);
    t.match(g.state(), { x:0, y:0, a:0 });
    g.right(-370);
    t.match(g.state(), { x:0, y:0, a:350 });
});

tap.test('left', async t => {
    const g = tg.make_turtle_graphics();
    g.left(90);
    t.match(g.state(), { x:0, y:0, a:270 });
    g.left(90);
    t.match(g.state(), { x:0, y:0, a:180 });
    g.left(90);
    t.match(g.state(), { x:0, y:0, a:90 });
    g.left(90);
    t.match(g.state(), { x:0, y:0, a:0 });
    g.left(0);
    t.match(g.state(), { x:0, y:0, a:0 });
    g.left();
    t.match(g.state(), { x:0, y:0, a:270 });
    g.left(-90);
    t.match(g.state(), { x:0, y:0, a:0 });
    g.left(-370);
    t.match(g.state(), { x:0, y:0, a:10 });
});

tap.test('square movement', async t => {
    const g = tg.make_turtle_graphics();
    g.forward(100);
    t.match(g.state(), { x:0, y:-100, a:0 });
    g.right(90);
    t.match(g.state(), { x:0, y:-100, a:90 });
    g.forward(100);
    t.match(g.state(), { x:100, y:-100, a:90 });
    g.right(90);
    t.match(g.state(), { x:100, y:-100, a:180 });
    g.forward(100);
    t.match(g.state(), { x:100, y:0, a:180 });
    g.right(90);
    t.match(g.state(), { x:100, y:0, a:270 });
    g.forward(100);
    t.match(g.state(), { x:0, y:0, a:270 });
    g.right(90);
    t.match(g.state(), { x:0, y:0, a:0 });
});

tap.test('pen', async t => {
    const g = tg.make_turtle_graphics();
    t.match(g.state(), { d:true });
    g.pendown();
    t.match(g.state(), { d:true });
    g.penup();
    t.match(g.state(), { d:false });
    g.penup();
    t.match(g.state(), { d:false });
    // TODO: test line_fn not being called with penup
});
