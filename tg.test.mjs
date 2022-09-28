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
    t.match(g, obj, 'global object has properties now'); // use match because obj won't have VERSION
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

tap.test('translate', async t => {
    const g = tg.make_turtle_graphics();
    g.translate(100, 50);
    t.match(g.state(), { x:0, y:0, a:0 }, 'no immediate change');
    g.forward(0);
    t.match(g.state(), { x:100, y:50, a:0 });
    g.forward(0);
    t.match(g.state(), { x:100, y:50, a:0 });
    
    g.translate();
    g.forward(0);
    t.match(g.state(), { x:100, y:50, a:0 }, 'no argument');
    g.translate(10);
    g.forward(0);
    t.match(g.state(), { x:110, y:50, a:0 }, 'single argument');
    g.translate(-110, 50);
    g.forward(100);
    t.match(g.state(), { x:0, y:0, a:0 });
});

tap.test('rotate', async t => {
    const g = tg.make_turtle_graphics();
    g.rotate(90);
    g.forward(100);
    t.match(g.state(), { x:100, y:0, a:90 });
    g.right(90);
    t.match(g.state(), { x:100, y:0, a:180 });
    g.forward(100);
    t.match(g.state(), { x:100, y:100, a:180 });
    g.rotate(-90);
    g.forward(0);
    t.match(g.state(), { x:100, y:-100, a:90 });
    g.rotate();
    g.forward(0);
    t.match(g.state(), { x:100, y:-100, a:90 }, 'no argument');
});

tap.test('rotate', async t => {
    let g;
    g = tg.make_turtle_graphics();
    g.scale(2, 2);
    g.forward(0);
    t.match(g.state(), { x:0, y:0, a:0 }, 'in origin');
    g.forward(100);
    t.match(g.state(), { x:0, y:-200, a:0 });
    g.right(90);
    g.forward(100);
    t.match(g.state(), { x:200, y:-200, a:90 });
    g.scale(1, 1);
    g.forward(0);
    t.match(g.state(), { x:200, y:-200, a:90 });
    g.scale(0.5, 0.5);
    g.forward(0);
    t.match(g.state(), { x:100, y:-100, a:90 });
    g = tg.make_turtle_graphics();
    g.scale(2, 0.5);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state(), { x:200, y:-50, a:90 }, 'differing arguments');
    g = tg.make_turtle_graphics();
    g.scale(2);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state(), { x:200, y:-200, a:90 }, 'single argument');
    g = tg.make_turtle_graphics();
    g.scale();
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state(), { x:100, y:-100, a:90 }, 'no argument');
});

tap.only('compound transformations', async t => {
    let g;
    g = tg.make_turtle_graphics();
    g.scale(2, 0.5);
    g.translate(100, 50);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state(), { x:400, y:-25, a:90 }, 'S/T');
    
    g = tg.make_turtle_graphics();
    g.translate(100, 50);
    g.scale(2, 0.5);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state(), { x:300, y:0, a:90 }, 'T/S');
    
    g = tg.make_turtle_graphics();
    g.scale(2, 0.5);
    g.rotate(90);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state(), { x:200, y:50, a:180 }, 'S/R'); // weird, but confirmed with p5
    
    g = tg.make_turtle_graphics();
    g.rotate(90);
    g.scale(2, 0.5);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state(), { x:50, y:200, a:180 }, 'R/S'); // confirmed with p5
    
    g = tg.make_turtle_graphics();
    g.rotate(90);
    g.translate(100, 50);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state(), { x:50, y:200, a:180 }, 'R/T'); // confirmed with p5
    
    g = tg.make_turtle_graphics();
    g.translate(100, 50);
    g.rotate(90);
    g.forward(0);
    g.forward(100);
    g.right(90);
    g.forward(100);
    t.match(g.state(), { x:200, y:150, a:180 }, 'T/R'); // confirmed with p5
});
