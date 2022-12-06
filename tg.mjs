// TODO: coordinate system orientation
import { vec2, mat3 } from 'gl-matrix';

const VERSION = '___VERSION___';
const TYPE = Symbol('Turtle Graphics Object');
const EPSILON = 1e-10;
const DEFAULT_FORWARD = 100;
const DEFAULT_RIGHT = 90;
const GLOBAL_LIB_NAME = 'tg';
const GLOBAL_INSTANCE_NAME = 't';
const GLOBAL_OVERWRITTEN_NAME = 'p5';
const DONT_GLOBALIZE = [ 'VERSION', 'TYPE' ];
const DONT_WARN_GLOBALIZING = [ 'self' ];


// Constructor function
export function make_turtle_graphics(...line_fns_) {
    function _make_turtle_state() {
        return {
            x:   0,    // position (x)
            y:   0,    // position (y)
            px:  0,    // previous position (x)
            py:  0,    // previous position (y)
            a:   0,    // angle (in degrees)
            
            // untransformed state
            ux:  0,
            uy:  0,
            upx: 0,
            upy: 0,
            ua:  0,
            
            d:   true, // pen down status
        };
    }
    
    // Full internal state
    const _state = {
        turtle:       _make_turtle_state(), // turtle state
        turtle_stack: [],                   // turtle stack
        matrix:       mat3.create(),        // transformation matrix
        matrix_stack: [],                   // matrix stack
        line_fns:     [...line_fns_],       // line drawing callbacks
        turtle_fn:    undefined,            // function called to draw the turtle
        mark_fn:      undefined,            // functino called to draw a mark
    };
    
    
    // Aliases and deprecation mechanism
    const _aliases = {};
    const _aliases_deprecated = {};
    function _add_aliases(orig, aliases, aliases_array = _aliases) {
        if (!(orig in aliases_array)) { aliases_array[orig] = []; }
        aliases_array[orig].push(...aliases);
    }
    function _add_aliases_deprecated(orig, aliases) {
        return _add_aliases(orig, aliases, _aliases_deprecated);
    }
    
    
    /*********************************************************
        Instance
     *********************************************************/
    
    // Add keys from obj that are missing from target_obj
    // Used to copy over properties in newturtle() and clone() that might have been added later
    // e.g. the plotter() function from tg-plot.mjs
    function _add_missing_props(obj, target_obj, except_startswith='_') {
        for (let key of Object.keys(obj)) {
            // console.log('checking', key)
            if ( !(key in target_obj) && !key.startsWith(except_startswith) ) {
                target_obj[key] = obj[key];
            }
        }
    }
    
    /**
     * Create a new turtle object.
     * 
     * @function newturtle
     * @returns {Object} A brand new turtle object. Has all turtle functions as properties.
     */
    function newturtle(...new_line_fns) {
        // use same line_fns as the current instance, if none are explicitly provided
        const new_turtle = make_turtle_graphics(
            ...(new_line_fns.length > 0 ? new_line_fns : _state.line_fns)
        );
        _add_missing_props(self, new_turtle);
        return new_turtle;
    }
    _add_aliases_deprecated('newturtle', ['maketurtle']);
    
    /**
     * Get the turtle object itself.
     * 
     * @function self
     * @returns {Object} A turtle object. Has all turtle functions as properties.
     */
    function self_() {
        return self;
    }
    
    /**
     * Get a copy of the turtle object.
     * <br>
     * Starts out in the same state as the original turtle, but changes to it don't affect the original one.
     * 
     * @function clone
     * @returns {Object} An exact clone of the turtle object returned by <code>{@link self}</code>. Has all turtle functions as properties.
     */
    function clone() {
        const new_turtle = make_turtle_graphics(..._state.line_fns); // make new turtle with same line_fns
        // clone all internal state properties except for functions (which cannot be cloned, because it containes functions)
        for (let key of Object.keys(_state).filter(x => !['line_fns', 'turtle_fn', 'mark_fn'].includes(x))) {
            new_turtle._state()[key] = structuredClone( _state[key] );
        }
        new_turtle._state().turtle_fn = _state.turtle_fn;
        new_turtle._state().mark_fn = _state.mark_fn;
        _add_missing_props(self, new_turtle);
        return new_turtle;
    }
    
    /**
     * Check whether an object is a turtle or not.
     * 
     * @function isturtle
     * @param {any} obj - The objcet to check. Can be anything.
     * @returns {boolean} <code>true</code> if <code>obj</code> is a Turtle Object, <code>false</code> otherwise.
     */
    function isturtle(obj) {
        return obj !== null && typeof obj === 'object' && 'TYPE' in obj && obj['TYPE'] === TYPE;
    }
    
    
    /*********************************************************
        Basic
     *********************************************************/
    
    function _draw() {
        const turtle = _state.turtle;
        if (!turtle.d) { return; } // don't draw if pen isn't down
        for (let line_fn of _state.line_fns) {
            if (typeof line_fn === 'function') {
                line_fn(turtle.px, turtle.py, turtle.x, turtle.y);
            }
        }
    }
    
    // 50.000000000000014 -> 50
    function _clean_zero(v) {
        if (Math.abs(v % 1) < EPSILON) {
            return Math.trunc(v);
        } else {
            return v;
        }
    }
    
    function _clean_angle(a) {
        a = a % 360;
        if (a < 0) { a += 360; }
        return a;
    }
    
    // transform point by matrix (defaults to current matrix)
    function _transform([x, y], m = undefined) {
        const p = [ x, y ];
        m = m ?? _state.matrix; // use current matrix by default
        vec2.transformMat3(p, p, m); // Apply given transformation
        p[0] = _clean_zero(p[0]);
        p[1] = _clean_zero(p[1]);
        return p;
    }
    
    /**
     * Move the turtle forward.
     * <br>
     * Draws a line, if the pen is down (see <code>{@link pendown}</code> and <code>{@link penup}</code>).
     * 
     * @function forward
     * @param [distance=100] {number} - How far to move forward, in pixels.
     * @see <code>{@link back}</code> to move back.
     */
    function forward(units = DEFAULT_FORWARD) {
        const turtle = _state.turtle;
        const matrix = _state.matrix;
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
        [ turtle.x, turtle.y ] = _transform( [turtle.ux, turtle.uy], matrix );
        [ turtle.px, turtle.py ] = _transform( [turtle.upx, turtle.upy], matrix );
        _draw();
    }
    
    /**
     * Move the turtle back.
     * <br>
     * Draws a line, if the pen is down (see <code>{@link pendown}</code> and <code>{@link penup}</code>).
     * 
     * @function back
     * @param [distance=100] {number} - How far to move back, in pixels.
     * @see <code>{@link forward}</code> to move forward.
     */
    function back(units = DEFAULT_FORWARD) {
        return forward(-units);
    }
    
    /**
     * Turn turtle to the right.
     * 
     * @function right
     * @param [angle=90] {number} - How far to turn the turtle right, in degrees (0–360).
     * @see <code>{@link left}</code> to turn left.
     */
    function right(angle = DEFAULT_RIGHT) {
        const turtle = _state.turtle;
        // update untransformed angle
        turtle.ua += angle;
        turtle.ua = _clean_angle(turtle.ua);
        // update transformed angle as well
        turtle.a += angle;
        turtle.a = _clean_angle(turtle.a);
    }
    
    /**
     * Turn turtle to the left.
     * 
     * @function left
     * @param [angle=90] {number} - How far to turn the turtle left, in degrees (0–360).
     * @see <code>{@link right}</code> to turn right.
     */
    function left(angle = DEFAULT_RIGHT) {
        return right(-angle);
    }
    
    /**
     * Lower the pen.
     * <br>
     * Subsequent uses of <code>{@link forward}</code> and <code>{@link back}</code> will draw lines.
     * A new turtle starts with the pen down.
     * 
     * @function pendown
     * @see <code>{@link penup}</code> to raise the pen.
     */
    function pendown(down = true) {
        _state.turtle.d = down;
    }
    
    /**
     * Raise the pen.
     * <br>
     * Subsequent uses of <code>{@link forward}</code> and <code>{@link back}</code> will NOT draw lines.
     * A new turtle starts with the pen down.
     * 
     * @function penup
     * @see <code>{@link penup}</code> to lower the pen.
     */
    function penup(up = true) {
        _state.turtle.d = !up;
    }
    
    
    /*********************************************************
        Transformations
     *********************************************************/
    
    /**
     * Translate the coordinate system.
     * 
     * @function translate
     * @param {number} tx - Amount in pixels to translate in the x-direction Positive numbers move to the right, negative numbers move to the left.
     * @param {number} ty - Amount in pixels to translate in the y-direction. Positive numbers move down, negative numbers move up.
     * @see <code>{@link rotate}</code> and <code>{@link scale}</code>, the other transformations.
     * @see <code>{@link resetmatrix}</code> to reset transformations.
     * @see <code>{@link pushmatrix}</code> to save transformations.
     * @see <code>{@link popmatrix}</code> to restore previously saved transformations.
     */
    function translate(tx = 0, ty = 0) {
        // update transformation matrix
        mat3.translate( _state.matrix, _state.matrix, [tx, ty] );
    }
    
    /**
     * Rotate the coordinate system.
     * 
     * @function rotate
     * @param {number} angle - The angle in degrees to rotate the coordinate system. A positive number rotates clockwise, a negative number counter-clockwise.
     * @see <code>{@link translate}</code> and <code>{@link scale}</code>, the other transformations.
     * @see <code>{@link resetmatrix}</code> to reset transformations.
     * @see <code>{@link pushmatrix}</code> to save transformations.
     * @see <code>{@link popmatrix}</code> to restore previously saved transformations.
     */
    function rotate(ra = 0) {
        const turtle = _state.turtle;
        // update transformation matrix
        mat3.rotate( _state.matrix, _state.matrix, ra / 180 * Math.PI );
        // update transformed angle as well
        turtle.a += ra;
        turtle.a = _clean_angle(turtle.a);
    }
    
    /**
     * Scale the coordinate system.
     * 
     * @function scale
     * @param {number} sx - The scaling factor in x-direction.
     * @param {number} [sy] - The scaling factor in y-direction. If ommitted, takes the same value as <code>sx</code>.
     * @see <code>{@link translate}</code> and <code>{@link rotate}</code>, the other transformations.
     * @see <code>{@link resetmatrix}</code> to reset transformations.
     * @see <code>{@link pushmatrix}</code> to save transformations.
     * @see <code>{@link popmatrix}</code> to restore previously saved transformations.
     */
    function scale(sx = 1, sy = undefined) {
        if (sy === undefined) { sy = sx; }
        // update transformation matrix
        mat3.scale( _state.matrix, _state.matrix, [sx, sy] );
    }
    
    
    /*********************************************************
        Stacks
     *********************************************************/
    
    /**
     * Push the turtle's state onto the stack.
     * <br>
     * Saves the current position, heading and pen state.
     * 
     * @function pushstate
     * @see <code>{@link popstate}</code> to later restore the pushed state.
     */
    function pushstate() {
        _state.turtle_stack.push( Object.assign({}, _state.turtle) ); // push a copy
    }
    _add_aliases_deprecated('pushstate', ['push_turtle']);
    
    /**
     * Restore the last pushed turtle state from the stack.
     * <br>
     * Restores position, heading and pen state to what they were when {@link pushstate} was last called.
     * 
     * @function popstate
     * @see <code>{@link pushstate}</code> to first save the turtle's state.
     */
    function popstate() {
        if (_state.turtle_stack.length > 0) {
            _state.turtle = _state.turtle_stack.pop();
        }
    }
    _add_aliases_deprecated('popstate', ['pop_turtle']);
    
    /**
     * Push the current transformation matrix onto the stack.
     * <br>
     * The transformation matrix contains all transformations, accumulated through calls to <code>{@link translate}</code>, <code>{@link rotate}</code> and <code>{@link scale}</code>.
     * 
     * @function pushmatrix
     * @see <code>{@link popmatrix}</code> to later restore the pushed transformation matrix.
     */
    function pushmatrix() {
        _state.matrix_stack.push( mat3.clone(_state.matrix) ); // push a copy
    }
    _add_aliases_deprecated('pushmatrix', ['push_matrix']);
    
    /**
     * Restore the last pushed transformation matrix from the stack.
     * 
     * @function popmatrix
     * @see <code>{@link pushmatrix}</code> to first save the transformation matrix.
     */
    function popmatrix() {
        if (_state.matrix_stack.length > 0) {
            _state.matrix = _state.matrix_stack.pop();
        }
    }
    _add_aliases_deprecated('popmatrix', ['pop_matrix']);
    
    /**
     * Push the turtle's state and transformation matrix onto the stack.
     * 
     * @function push
     * @see <code>{@link pushstate}</code> to only save the turtle's state.
     * @see <code>{@link pushmatrix}</code> to only save the transformation matrix.
     */
    function push() {
        pushstate();
        pushmatrix();
    }
    
    /**
     * Restore the last pushed turtle state and transformation matrix from the stack.
     * 
     * @function pop
     * @see <code>{@link popstate}</code> to only restore the turtle's state.
     * @see <code>{@link popmatrix}</code> to only restore the transformation matrix.
     */
    function pop() {
        popstate();
        popmatrix();
    }
    
    
    /*********************************************************
        Get state
     *********************************************************/
    
    /**
     * An object describing a turtle's position.
     * Used with {@link xy}, {@link setxy} and {@link jumpxy}.
     * 
     * @typedef {Object} Position
     * @property x {number} - The x-coordinate in pixels.
     * @property y {number} - The y-coordinate in pixels.
     * @see <code>{@link xy}</code> to get the turtle's position.
     * @see <code>{@link setxy}</code> to set the turtle's position.
     * @see <code>{@link jumpxy}</code> to set the turtle's position without drawing.
     */
     
    /**
     * Get the turtle's position.
     * 
     * @function xy
     * @returns {Position} A {@link Position} object containing <code>x</code> and <code>y</code>.
     */
    function xy() {
        return { x: _state.turtle.x, y: _state.turtle.y };
    }
    
    /**
     * Get the turtle's x-coordinate.
     * 
     * @function x
     * @returns {number} The turtle's x-coordinate in pixels.
     */
    function x() {
        return _state.turtle.x;
    }
    _add_aliases_deprecated('x', ['xcor']);
    
    /**
     * Get the turtle's y-coordinate.
     * 
     * @function y
     * @returns {number} The turtle's y-coordinate in pixels.
     */
    function y() {
        return _state.turtle.y;
    }
    _add_aliases_deprecated('y', ['ycor']);
    
    /**
     * Get the turtle's heading.
     * 
     * @function heading
     * @returns {number} The turtle's heading angle in degrees (0–360).
     */
    function heading() {
        return _state.turtle.a;
    }
    
    /**
     * Get whether the pen is currently down.
     * 
     * @function isdown
     * @returns {boolean} <code>true</code> if pen is down, <code>false</code> otherwise.
     */
    function isdown() {
        return _state.turtle.d;
    }
    
    /**
     * Get whether the pen is currently up.
     * 
     * @function isup
     * @returns {boolean} <code>true</code> if pen is up, <code>false</code> otherwise.
     */
    function isup() {
        return !_state.turtle.d;
    }
    
    /**
     * An object describing a turtle's state. Used with <code>{@link state}</code> and <code>{@link setstate}</code>.
     * 
     * @typedef {Object} State
     * @property {number} x - The x-coordinate in pixels.
     * @property {number} y - The y-coordinate in pixels.
     * @property {number} a - The heading angle in degreed (0–360).
     * @property {boolean} d - <code>true</code> if the pen is down, <code>false</code> otherwise.
     * @see {@link state} to get the turtle's state.
     * @see {@link setstate} to set the turtles's state.
     */
     
    /**
     * Get the turtle's current position, heading angle and pen position as an object.
     * 
     * @function state
     * @returns {State} A {@link State} object containing <code>x</code> (the x-coordinate), <code>y</code> (the y-coordinate), <code>a</code> (the heading angle) and <code>d</code> (the pen down state).
     */
    function state() {
        const turtle = _state.turtle;
        return { x: turtle.x, y: turtle.y, a: turtle.a, d: turtle.d };
    }
    _add_aliases_deprecated('state', ['getturtle']);
    
    
    /*********************************************************
        Get relative state
     *********************************************************/
    
    function _to_point(x, y) {
        // allow [x, y] as first parameter
        // needs to be tested first, cause arrays of type 'object'
        if (Array.isArray(x)) {
            const arr = x;
            x = arr.at(0);
            y = arr.at(1);
        }
        // allow turtle object as first parameter
        else if (isturtle(x)) {
            const obj = x;
            x = obj.x();
            y = obj.y();
        }
        // allow {x, y} as first parameter
        else if (typeof x === 'object' && x !== null) {
            const obj = x;
            x = obj?.x;
            y = obj?.y;
        } 
        return { x, y };
    }
     
    function _check_number(val, warning_domain, var_name, allow_null_undefined = false) {
        if (allow_null_undefined && (val === null || val === undefined)) {
            return true;
        }
        if (!Number.isFinite(val)) {
            if (warning_domain && var_name) {
                console.warn('%s: %s needs to be a proper number (cannot be NaN or Infinity)', warning_domain, var_name);
            }
            return false;
        }
        if (typeof val !== 'number') {
            if (warning_domain && var_name) {
                console.warn('%s: %s needs to be a number', warning_domain, var_name);
            }
            return false;
        }
        return true;
    }
    
    /**
     * Get the bearing from the turtle to a given point.
     * <br>
     * The bearing is the angle from the turtle's heading direction to the given point.
     * In other words, the bearing is the angle the turtle needs to turn <code>{@link right}</code> in order to face the given point.
     * 
     * @function bearing
     * @param {number|Position} x - The x-coordinate of the point to get the bearing to or a {@link Position} object. The other parameter (<code>y</code>) is ignored, if a {@link Position} object is given.
     * @param {number} [y] - The y-coordinate of the point to get the bearing to.
     * @returns {number} The bearing to the given point in degrees (-180 to +180).
     * @see <code>{@link right}</code> to turn towards the point.
     * @see <code>{@link face}</code> for a convenience function to face a given point.
     */
    function bearing(x, y) {
        ({ x, y } = _to_point(x, y));
        if ( ! _check_number(x, 'bearing', 'x') ) { return; }
        if ( ! _check_number(y, 'bearing', 'y') ) { return; }
        const turtle = _state.turtle;
        // vector to point xy
        const vx = x - turtle.x;
        const vy = y - turtle.y;
        if (vx == 0 && vy == 0) { return 0; }
        let b = Math.atan2(vy, vx) / Math.PI * 180; // [-180, +180] angle between positive x-axis and vector
        b = b + 90 - turtle.a;
        b = _clean_angle(b);
        if (b > 180) { b -= 360; } // make output [-180, 180]
        return b;
    }
    
    /**
     * Get the distance from the turtle to a given point.
     * 
     * @function distance
     * @param {number|Position} - The x-coordinate of the point to get the distance to or a {@link Position} object. The other parameter (<code>y</code>) is ignored, if a {@link Position} object is given.
     * @param {number} [y] - The y-coordinate of the point to get the distance to.
     * @returns {number} The distance to the given point in pixels.
     */
    function distance(x, y) {
        ({ x, y } = _to_point(x, y));
        if ( ! _check_number(x, 'distance', 'x') ) { return; }
        if ( ! _check_number(y, 'distance', 'y') ) { return; }
        [x, y] = _transform([x, y]); // apply current transformation to point
        const turtle = _state.turtle;
        const dx = x - turtle.x;
        const dy = y - turtle.y;
        return Math.sqrt(dx*dx + dy*dy);
    }
    
    
    /*********************************************************
        Set state
     *********************************************************/
    
    /**
     * Set the turtle's position.
     * <br>
     * Draws a line to the new position, if the pen is down (see <code>{@link pendown}</code> and <code>{@link penup}</code>).
     * 
     * @function setxy
     * @param {(number|Position)} x - The x-coordinate or a {@link Position} object. The other parameter (<code>y</code>) is ignored if a {@link Position} object is given.
     * @param {number} [y] - The y-coordinate. Ignored if <code>x</code> is given a {@link Position} object.
     */
    // TODO: think about naming (e.g. moveto, lineto)
    function setxy(x, y) {
        ({ x, y } = _to_point(x, y));
        if ( ! _check_number(x, 'setxy', 'x', true) ) { return; }
        if ( ! _check_number(y, 'setxy', 'y', true) ) { return; }
        const turtle = _state.turtle;
        const matrix = _state.matrix;
        if (x === null || x === undefined) { x = turtle.x; }
        if (y === null || y === undefined) { y = turtle.y; }
        
        // save previous position
        turtle.upx = turtle.ux;
        turtle.upy = turtle.uy;
        turtle.px  = turtle.x;
        turtle.py  = turtle.y;
        
        // new position (untransformed)
        turtle.ux = x;
        turtle.uy = y;
        
        // transformed position
        [ turtle.x, turtle.y ] = _transform( [turtle.ux, turtle.uy], matrix );
        [ turtle.px, turtle.py ] = _transform( [turtle.upx, turtle.upy], matrix );
        _draw();
    }
    
    /**
     * Set the turtle's position, without drawing to the new position.
     * 
     * @function jumpxy
     * @param {number|Position} x - The x-coordinate or a {@link Position} object. The other parameter (<code>y</code>) is ignored if a {@link Position} object is given.
     * @param {number} [y] - The y-coordinate. 
     */
    function jumpxy(x, y) {
        const down = isdown(); // save pen down state
        penup();
        setxy(x, y);
        pendown(down); // restore pen down state
    }
    
    /**
     * Set the turtle's heading.
     * 
     * @function setheading
     * @param {number} angle - The heading angle (0–360).
     */
    function setheading(angle) {
        if ( ! _check_number(angle, 'setheading', 'angle') ) { return; }
        const turtle = _state.turtle;
        const rotation = turtle.a - turtle.ua; // get rotation applied via rotate()
        // set untransformed angle
        turtle.ua = angle;
        turtle.ua = _clean_angle(turtle.ua);
        // set transformed angle as well
        turtle.a = angle + rotation;
        turtle.a = _clean_angle(turtle.a);
    }
    
    /**
     * Turn the turtle to face a given point.
     * 
     * @function face
     * @param {number|Position} - The x-coordinate of the point to face or a {@link Position} object. The other parameter (<code>y</code>) is ignored, if a {@link Position} object is given.
     * @param {number} [y] - The y-coordinate of the point to face.
     */
    function face(x, y) {
        ({ x, y } = _to_point(x, y));
        if ( ! _check_number(x, 'face', 'x') ) { return; }
        if ( ! _check_number(y, 'face', 'y') ) { return; }
        right( bearing(x, y) );
    }
    
        
    function _to_turtle(x, y, a, d) {
        // TODO: maybe allow x as pos, y as angle, a as down
        
        // allow [x, y, a, d] as first parameter
        // needs to be tested first, cause arrays are of type 'object'
        if (Array.isArray(x)) {
            const arr = x;
            x = arr.at(0);
            y = arr.at(1);
            a = arr.at(2);
            d = arr.at(3);
        }
        // allow turtle object as first parameter
        else if (isturtle(x)) {
            const obj = x;
            x = obj.x();
            y = obj.y();
            a = obj.heading();
            d = obj.isdown();
        }
        // allow {x, y, a, d} as first parameter
        else if (typeof x === 'object' && x !== null) {     
            const obj = x;
            x = obj?.x;
            y = obj?.y;
            a = obj?.a;
            d = obj?.d;
        }
        return { x, y, a, d };
    }
    
    /**
     * Set the turtle's position, heading angle and/or pen state.
     * 
     * @function setstate
     * @param {number|State} x - The x-coordinate in pixels or a {@link State} object. The other parameters are ignored if a {@link State} object is given.
     * @param {number} [y] - The y-coordinate in pixels.
     * @param {number} [h] - The heading angle in degrees (0–360).
     * @param {number} [d] - The pen down state, <code>true</code> for down, <code>false</code> for up.
     */
    // TOOD: check new_turtle
    function setstate(x, y, a, d) {
        const new_turtle = _to_turtle(x, y, a, d);
        setxy(new_turtle.x, new_turtle.y); // tolerates undefined
        if ( Number.isFinite(new_turtle.a) ) { setheading(new_turtle.a); }
        if ( typeof new_turtle.d === 'boolean' ) { pendown(new_turtle.d); }
    }
    _add_aliases_deprecated('setstate', ['setturtle']);
    
    /**
     * Reset the turtle's state.
     * <br>
     * Resets the turtles position, heading and pen position to its original state, at the center (x=0, y=0), facing up (heading 0) with the pen down.
     * This doesn't cause a line to be drawn to the center.
     * 
     * @function resetstate
     * @see <code>{@link resetmatrix}</code> to reset transformations.
     * @see <code>{@link reset}</code> to reset everything (both state and transformations).
     */
    function resetstate() {
        _state.turtle = _make_turtle_state(); // turtle state
        // TODO: should this happen?
        _state.turtle_stack = [];             // turtle stack
    }
    _add_aliases_deprecated('resetstate', ['reset_turtle']);
    
    /**
     * Reset the turtle's transformation matrix.
     * 
     * @function resetmatrix
     * @see <code>{@link resetstate}</code> to reset state.
     * @see <code>{@link reset}</code> to reset everything (both state and transformations).
     */
    function resetmatrix() {
        _state.matrix = mat3.create();   // transformation matrix
        // TODO: should this happen?
        _state.matrix_stack = [];        // matrix stack
    }
    _add_aliases_deprecated('resetmatrix', ['reset_matrix']);
    
    /**
     * Completetly reset the turtle to its original state.
     * <br>
     * Resets the turtles position (to the center at x=0, y=0), heading (facing up, at heading 0) and pen (down). Also clears all transformations, that might have been applied. After this, the turtle is like new, like it was just created.
     * 
     * @function reset
     * @see <code>{@link resetstate}</code> to reset state only.
     * @see <code>{@link resetmatrix}</code> to reset transformation only.
     */
    function reset() {
        resetstate();
        resetmatrix();
    }
    
    
    /*********************************************************
        Markings
     *********************************************************/
    
    /**
     * Draw the turtle at its current position.
     * 
     * @function show
     * @param {number} [size=15] Size of the drawn turtle in pixels (height from tip to base).
     */
    function show(size = 15) {
        const top_angle = 36;
        const height = size;
        const diamond_size = size / 15;
        const center = 2/3; // 0 (top) .. 1 (bottom) (2/3 = center of gravity)
        
        const base_angle = (180 - top_angle) / 2;
        const side = height / Math.cos(top_angle/2 / 360 * Math.PI * 2);
        const base = 2 * height * Math.tan(top_angle/2 / 360 * Math.PI * 2);
        const diamond_side = Math.sqrt(2) * diamond_size / 2;
        
        pushstate();
        pendown();
        
        if (typeof _state.turtle_fn === 'function') {
            _state.turtle_fn.call(undefined, size);
        } else {
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
        }
        
        popstate();
    }
    _add_aliases_deprecated('show', ['turtle']);
    
    function setturtlefunction(fn) {
        if (typeof fn === 'function') {
            _state.turtle_fn = fn;
        } else {
            _state.turtle_fn = undefined;
        }
    }
    
    /**
     * Draw a small + at the turtle's current position.
     * <br>
     * The orientation of the mark is independent of the turtle's current heading.
     * 
     * @function mark
     * @param {number} [size=10] - Size of the mark in pixels.
     * @param {number} [rotation=0] - Rotation of the mark in degrees (0–90). Set to 45 to draw an ✕.
     */
    function mark(size = 10, rotation = 0) {
        pushstate();
        setheading(rotation);
        pendown();
        
        if (typeof _state.mark_fn === 'function') {
            _state.mark_fn.call(undefined, size, rotation);
        } else {
            penup();
            pushstate();
            back(size/2);
            pendown();
            forward(size);
            penup();
            popstate();
            
            right(90);
            back(size/2);
            pendown();
            forward(size);
        }
        
        popstate();
    }
    
    function setmarkfunction(fn) {
        if (typeof fn === 'function') {
            _state.mark_fn = fn;
        } else {
            _state.mark_fn = undefined;
        }
    }
    
    /*********************************************************
        Util
     *********************************************************/
    /**
     * Break out of a {@link repeat} or {@link foreach} loop.
     * <br>
     * Can only be used within a function given to {@link repeat} or {@link foreach}. Will immediately terminate the function and cause the loop to stop.
     * 
     * @function breakout
     * @see {@link repeat}
     * @see {@link foreach}
     */
    let _loop_count = 0; // count of loop callbacks (from repeat or foreach) that are currently in progress
    const _break_exception = Symbol('Breakout Exception');
    function breakout() {
        if (_loop_count > 0) {
            throw _break_exception;
        } else {
            console.warn('Looks like you used `breakout` outside of a loop. breakout can only be used inside a `repeat` or `foreach` function.');
        }
    }
    
    /**
     * Repeat a function a number of times.
     * <br>
     * (Advanced) The loop can be stopped with {@link breakout}.
     * 
     * @function repeat
     * @param {number} n - Number of times to call the function. Needs to be greater than 0, or no calls will happen.
     * @param {function} fn - The function to be called repeatedly. It is called with a single number (0 to n-1) as an argument, containing the count of previous calls.
     * @returns {Array|undefined} (Advanced) An array of the return values of the individual calls to <code>fn</code>, or <code>undefined</code> if none of the function calls returns anything.
     * @see {@link breakout} for stopping the loop.
     */
    function repeat(n, fn) {
        if ( typeof n !== 'number' ) { 
            console.warn('repeat: the number you provided is invalid');
            return;
        }
        
        if (typeof fn !== 'function') {
            console.warn('repeat: the function you provided is invalid');
            return;
        }
        
        n = Math.floor(n); // Allow floats
        let results = [];
        let got_result = false;
        
        for (let i=0; i<n; i++) {
            let result;
            _loop_count += 1; // enter loop
            try {
                result = fn(i);
            } catch (e) {
                _loop_count -= 1; // exit loop (break or exception)
                if (e === _break_exception) {
                    break; // break out of loop
                } else {
                    throw e;
                }
            }
            _loop_count -= 1; // exit loop (normally)
            if (result !== undefined) { got_result = true; }
            results.push(result);
        }
        
        if (got_result) { return results; }
        return undefined;
    }
    
    function _is_iterable(x) {
        if (x === null || x === undefined) { return false; }
        return typeof x[Symbol.iterator] === 'function';
    }
    
    /**
     * Call a function for each element of an array.
     * <br>
     * (Advanced) The loop can be stopped with {@link breakout}.
     * 
     * @function foreach
     * @param {Iterable} a - An array or (advanced use) any other Iterable, like the return value of a {@link range} call.
     * @param {function} fn - The function to be called for each element. It is called with three arguments <code>el</code>, <code>i</code> and <code>a</code>. <code>el</code> is the current element from the array, <code>i</code> is a running index starting at 0, and <code>a</code> is the array itself.
     * @returns {Array|undefined} (Advanced) An array of the return values of the individual calls to <code>fn</code>, or <code>undefined</code> if none of the function calls returns anything.
     * @see {@link breakout} for stopping the loop.
     */
    function foreach(x, fn) {
        // const iterable = _is_iterable(x);
        // if (! (iterable || type(x) === 'object')) {
        if (! _is_iterable(x) ) {
            console.warn('foreach: you need to provide an iterable');
            return;
        }
        
        if (typeof fn !== 'function') {
            console.warn('foreach: function is invalid');
            return;
        }
        
        let results = [];
        let got_result = false;
        
        let idx = 0;
        // for (let el of (iterable ? x : Object.entries(x))) {
        for (let el of x) {
            let result;
            _loop_count += 1; // enter loop
            try {
                result = fn(el, idx, x); // call with the current element the index and the full object
            } catch (e) {
                _loop_count -= 1; // exit loop (break or exception)
                if (e === _break_exception) {
                    break; // break out of loop
                } else {
                    throw e;
                }
            }
            _loop_count -= 1; // exit loop (normally)
            if (result !== undefined) { got_result = true; }
            results.push(result);
            idx += 1;
        }
        
        if (got_result) { return results; }
        return undefined;
    }
    
    /**
     * Get a sequence of numbers for use in loops (like {@link foreach} and [<code>for...of</code>]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of}).
     * This function can be called in two different ways:<br>
     * <br>
     * <code>range(stop)</code><br>
     * Produces a sequence starting at 0, up until but not including <code>stop</code>, with </code>step</code> 1.<br>
     * <br>
     * <code>range(start, stop, step = 1)</code><br>
     * Produces a sequence starting at <code>start</code>, up until but not including <code>stop</code>, with an optional <code>step</code> (default is 1).
     * 
     * @function range
     * @param {number} start - Start value, if <code>range</code> is called with two or three arguments, or stop value if called with one arguement only.
     * @param {number} [stop] - Stop value, if <code>range</code> is called with two or three arguments, ignored otherwise.
     * @param {number} [step=1] - Step value. Can only be used if <code>range</code> is called with three arguments.
     * @returns {Iterable} An Iterable object that returns the sequence of numbers. Can be used with [<code>for...of</code>]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of} and (advanced usage) with the [spread (<code>...</code>) syntax]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax}.
     */
    function range(start_, stop_ = undefined, step = 1) {
        const start = (stop_ === undefined || stop_ == null) ? 0 : start_;
        const stop = (stop_ === undefined || stop_ == null) ? start_ : stop_;
        return {
            * [Symbol.iterator]() {
                let i = start; // always use a new counter for each iterator
                if (step > 0) {
                    while (i < stop) {
                        yield i;
                        i += step;
                    }
                } else {
                    while (i > stop) {
                        yield i;
                        i += step;
                    }
                }
            },
            array() {
                return Array.from(this);
                // return [...this];
            },
        };
    }
    
    /**
     * Determine the type of any value.<br>
     * <br>
     * Returns one of the following strings:<br>
     * – <code>"number"</code> if the value is any number.<br>
     * – <code>"string"</code> if the value is a string.<br>
     * – <code>"boolean"</code> if the value is <code>true</code> or <code>false</code>.<br>
     * – <code>"function"</code> if the value is a function.<br>
     * – <code>"array"</code> if the value is an array.<br>
     * – <code>"object"</code> if the value is any other object.<br>
     * – <code>"undefined"</code> if the value is <code>undefined</code>.<br>
     * – <code>"null"</code> if the value is <code>null</code>.<br>
     * 
     * @function type
     * @param {any} value - The value you want to get the type of, can be anything.
     * @returns {string} - A string describing the type of <code>value</code>, see above.
     */
    function type(value) {
        if (value === null) { return 'null'; }
        if (Array.isArray(value)) { return 'array'; }
        return typeof value;
    }
    
    
    /*********************************************************
        Internal
     *********************************************************/
    
    /*
     * Get full internal state.
     * 
     * @function _state
     */
    // Note: this function exposes the actual internal objects
    function _state_() {
        return _state;
    }
    
    /*
     * Add function to be called when a line is drawn by the library.
     * 
     * @function _add_line_fn
     * @see <code>{@link _rm_line_fn}</code> to remove a function.
     */
    function _add_line_fn(fn) {
        if (typeof fn === 'function') {
            _state.line_fns.push(fn);
        }
    }
    
    /*
     * Remove a function previously added by {@link _add_line_fn}.
     * 
     * @function _rm_line_fn
     * @see <code>{@link _add_line_fn}</code> to add a function.
     */
    function _rm_line_fn(fn) {
        const line_fns = _state.line_fns;
        const idx = line_fns.indexOf(fn);
        if (idx >= 0) {
            line_fns.splice(idx, 1);
        }
    }
    
    
    const self = {
        TYPE,
        VERSION,
        // Instance
        newturtle,
        isturtle,
        self: self_,
        clone,
        // Basics
        forward,
        back,
        right,
        left,
        pendown,
        penup,
        // Transformations
        translate,
        rotate,
        scale,
        // Stacks
        pushstate,
        popstate,
        pushmatrix,
        popmatrix,
        push,
        pop,
        // Get state
        xy,
        x,
        y,
        heading,
        isdown,
        isup,
        state,
        // Get relative state
        bearing,
        distance,
        // Set state
        setxy,
        jumpxy,
        setheading,
        face,
        setstate,
        resetstate,
        resetmatrix,
        reset,
        // Markings
        show,
        mark,
        setturtlefunction,
        setmarkfunction,
        // Util
        type,
        repeat,
        foreach,
        breakout,
        range,
        // Internal
        _state: _state_,
        _add_line_fn,
        _rm_line_fn,
    };
    
    // add aliases
    for (let [orig, aliases] of Object.entries(_aliases)) {
        for (let alias of aliases) {
            if (!(alias in self) && orig in self) {
                self[alias] = self[orig];
            }
        }
    }
    // add deprecations
    for (let [orig, aliases] of Object.entries(_aliases_deprecated)) {
        for (let alias of aliases) {
            if (!(alias in self) && orig in self) {
                self[alias] = function(...args) {
                    console.warn(`🐢 '${alias}' is deprecated. Please use '${orig}' instead.`);
                    return self[orig](...args);
                };
            }
        }
    }
    
    return self;
}


// Fresh instance as default export
export const default_instance = make_turtle_graphics();
export default default_instance;


// Put properties of an object into the global namespace
export function globalize(tg_instance = default_instance, global_object = globalThis) {
    const overwritten = {};
    const failed = {};
    for (const [key, val] of Object.entries(tg_instance).filter( x => ! DONT_GLOBALIZE.includes(x[0]) )) {
        const saved_value = global_object[key];
        try {
            // Use defineProperty, so p5 won't detect the change and complain
            Object.defineProperty(global_object, key, {
                configurable: true,
                enumerable: true,
                writable: true,
                value: val
            });
            if (saved_value !== undefined && ! DONT_WARN_GLOBALIZING.includes(key) ) {
                overwritten[key] = saved_value;
            }
        } catch {
            failed[key] = saved_value;
        }
    }
    const overwritten_keys = Object.keys(overwritten);
    if (overwritten_keys.length > 0) {
        console.log(`🐢 → Overwritten global properties: ${overwritten_keys.join(', ')}`);
    }
    if (overwritten_keys.length > 0) {
        for (const [key, val] of Object.entries(overwritten)) {
            Object.defineProperty(global_object[GLOBAL_OVERWRITTEN_NAME], key, {
                configurable: true,
                enumerable: true,
                writable: true,
                value: val
            });
        }
        console.log(`🐢 → Overwritten global properties are still available via: ${GLOBAL_OVERWRITTEN_NAME}`);
    }

    if (global_object && global_object[GLOBAL_OVERWRITTEN_NAME] === undefined) {
        global_object[GLOBAL_OVERWRITTEN_NAME] = overwritten;
    }
    
    const failed_keys = Object.keys(failed);
    if (failed_keys.length > 0) {
        console.warn(`🐢 → Failed to overwrite global properties: ${failed_keys.join(', ')}`);
    }
    
    tg_instance._globalized = true; // Add a flag
    return overwritten;
}

// Initialize p5.js
// Needs to be called in setup() after createCanvas()
// let _init_called = false;
// 
// export function init(do_globalize = false) {
//     if (_init_called) { return; }
//     if (window.p5?.instance) {
//         console.log(`🐢 → Init: p5.js v${window.p5.VERSION}`);
//         // set line function of default instance
//         default_instance.set_line_fn( window.p5.instance.line.bind(window.p5.instance) );
//         
//         // translate to center on every draw
//         window.p5.instance.registerMethod('pre', function() {
//             default_instance.reset_matrix();
//             window.p5.instance.translate.call( window.p5.instance, window.p5.instance.width/2, window.p5.instance.height/2 );
//         });
//         
//         // translate to center (setup)
//         if (window.p5.instance._setupDone === false) {
//             window.p5.instance.translate.call( window.p5.instance, window.p5.instance.width/2, window.p5.instance.height/2 );
//         }
//         // globalize properties
//         if (do_globalize) { globalize(); }
//     } else {
//         console.warn('🐢 → Init: No p5.js detected');
//     }
//     _init_called = true;
//     return default_instance;
// }


// Bootstrap browser
let _browser_bootstrapped = false;
function is_browser() {
    try {
        return window !== undefined || self !== undefined; 
    } catch {
        return false;
    }
}

// Automatically init p5.js
// Needs to be called after the p5 script is loaded, before the 'load' event
let _init_called = false;

function auto_init(do_globalize = false) {
    if (_init_called) { return; }
    if (window?.p5?.prototype) {
        console.log(`🐢 → Init: p5.js v${window.p5.prototype.VERSION}`);
        // console.log(window.p5.prototype);
        
        // init hook
        // called in the p5 constructor
        // after: _start(), _setup(), _draw(), remove() are added to the instance
        // before: p5 properties are added to the window; _start() is called
        window.p5.prototype._registeredMethods.init.push(function() {
            // 'this' is the p5 instance
            // -> set line function
            default_instance._add_line_fn( this.line.bind(this) );
            
            const original__start = this._start;
            this._start = function(...args) {
                // 'this' is the p5 instance
                // properties have just been added to window
                // -> globalize properties
                if (do_globalize) { globalize(); }
                original__start.call(this, ...args);
            };
        });
        
        // -> translate to center (setup)
        const original_createCanvas = window.p5.prototype.createCanvas;
        window.p5.prototype.createCanvas = function(...args) {
            // 'this' is the p5 instance
            original_createCanvas.call(this, ...args);
            this.translate(this.width/2, this.height/2);
            default_instance._p5_viewbox = [-this.width/2, -this.height/2, this.width, this.height ]; // TODO: beautify
        }
        
        // -> reset transformations, translate to center (draw)
        window.p5.prototype._registeredMethods.pre.push(function() {
            // Warning: 'this' is either window (in p5.global mode) or the p5 instance (in instance mode)
            default_instance.resetmatrix();
            if (this === window) {
                // global mode; instance is available via window.p5.instance
                window.p5.instance.translate.call( window.p5.instance, window.p5.instance.width/2, window.p5.instance.height/2 );
            } else {
                this.translate(this.width/2, this.height/2);
            }
        });
        
        // Adjust mouseX and mouseY so they are measured from the center
        const original__updateNextMouseCoords = window.p5.prototype._updateNextMouseCoords;
        window.p5.prototype._updateNextMouseCoords = function(...args) {
            const hasMouseInteracted = this._hasMouseInteracted; // save this before calling _updateNextMouseCoords
            original__updateNextMouseCoords.call(this, ...args);
            this._setProperty('mouseX', this.mouseX - this.width/2);
            this._setProperty('mouseY', this.mouseY - this.height/2);
            if (!hasMouseInteracted) { // on the first interaction fix pmouseX/Y as well
                this._setProperty('pmouseX', this.pmouseX - this.width/2);
                this._setProperty('pmouseY', this.pmouseY - this.height/2);
            }
        }
    } else {
        console.warn('🐢 → Init: No p5.js detected');
    }
    _init_called = true;
}

(function bootstrap_browser() {
    if (_browser_bootstrapped) { return; }
    if (is_browser()) {
        console.log(`🐢 Turtle Graphics (v${VERSION})`);
        
        // put lib functions into global scope
        if (window[GLOBAL_LIB_NAME] === undefined) {
            window[GLOBAL_LIB_NAME] = {
                default_turtle: default_instance,
                maketurtle: default_instance.maketurtle,
                // init,
                globalize
            };
            console.log(`🐢 → Global library: ${GLOBAL_LIB_NAME}`);
        }
        
        // put default instance into global scope
        if (window[GLOBAL_INSTANCE_NAME] === undefined) {
            window[GLOBAL_INSTANCE_NAME] = default_instance;
            console.log(`🐢 → Global turtle: ${GLOBAL_INSTANCE_NAME}`);
        }
        
        // Do not gloablize functions if "dontglobalize" queryparam is set
        function check_boolean_attr(attr) {
            return attr !== null && attr !== "0" && attr.toLowerCase() !== 'false' && attr.toLowerCase() !== 'no';
        }
        const url = new URL(import.meta.url);
        const do_globalize = check_boolean_attr(url.searchParams.get('dontglobalize')) ? false : true;
        
        auto_init(do_globalize);
        
        _browser_bootstrapped = true;
    }
})();
