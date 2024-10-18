## Contents

* [Getting started](#getting-started)
* [How to set up (manually)](#how-to-set-up)
* [The turtle coordinate system](#the-turtle-coordinate-system)
* [Functions overview](#functions-overview)

<span id="getting-started" />
  
## Getting started

You can use this <a href="https://p5js.org">p5.js</a> starter sketch to get up and running quickly: <a href="https://bit.ly/turtle-sketch-v4">bit.ly/turtle-sketch-v4</a>

<span id="how-to-set-up" />

## How to set up (manually)

Include the following script tags in the `<head>` section of your `index.html`:

<!--- Note: the VERSION tag below is replaced with the version string from package.json --->
```html
<script src="https://sketch.process.studio/turtle-graphics/___VERSION___/tg.mjs" type="module"></script>
<script src="https://sketch.process.studio/turtle-graphics/___VERSION___/tg-plot.mjs" type="module"></script>
```

These scripts need to be included after `p5.js`, so your `index.html` should look something like this:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.10.0/p5.js"></script>
    <script src="https://sketch.process.studio/turtle-graphics/___VERSION___/tg.mjs" type="module"></script>
    <script src="https://sketch.process.studio/turtle-graphics/___VERSION___/tg-plot.mjs" type="module"></script>
    <link rel="stylesheet" type="text/css" href="style.css">
    <meta charset="utf-8" />
  </head>
  <body>
    <main>
    </main>
    <script src="sketch.js"></script>
  </body>
</html>
```

<span id="the-turtle-coordinate-system" />

## The turtle coordinate system

<img src="./images/2022-11-21_coord_system.png" style="max-width:600px;" />

* The turtle always starts at the origin, with coordinates (0, 0).
    * The **origin** is in the **center** of the p5.js canvas. This is different from p5.js, where the origin is in the top-left corner.
    * The x-axis goes from left to right. Negative values are left of the origin, positive values right, same as p5.js.
    * The y-axis goes from top to bottom. Negative values are **above** the origin, positive values **below**, same as p5.js.
* The turtle always starts with **heading 0**, which is **up** (or “north”).
    * The heading is measured in degrees, starting at the top and moving **clockwise**.
    * A heading of 90 is right (or “east”).
    * A heading of 180 is down (or “south”).
    * A heading of 270 is left (or “west”).
    * **Negative values** can also be used, these are measured **counter-clockwise**. For example: -90 is left, -180 is down, -270 is right.
    

<span id="functions-overview" />

## Functions overview

Here is an index to all functions, grouped by type:

### Basic

* `{@link forward}` — Move the turtle forward
* `{@link back}` — Move the turtle back
* `{@link left}` — Turn turtle to the left
* `{@link right}` — Turn turtle to the right
* `{@link penup}` — Raise the pen
* `{@link pendown}` — Lower the pen

### Get state

* `{@link xy}` — Get the turtle's position
* `{@link x}` — Get the turtle's x-coordinate
* `{@link y}` — Get the turtle's y-coordinate
* `{@link heading}` — Get the turtle's heading
* `{@link isdown}` — Get whether the pen is currently down
* `{@link isup}` — Get whether the pen is currently up
* `{@link state}` — Get the turtle's current position, heading angle and pen position as an object
* `{@link outside}` — Get whether the turtle is currently outside of the canvas
* `{@link inside}` — Get whether the turtle is currently inside of the canvas

### Get relative state

* `{@link bearing}` — Get the bearing from the turtle to a given point
* `{@link distance}` — Get the distance from the turtle to a given point

### Set state

* `{@link setxy}` — Set the turtle's position
* `{@link jumpxy}` — Set the turtle's position, without drawing to the new position
* `{@link setheading}` — Set the turtle's heading
* `{@link face}` — Turn the turtle to face a given point
* `{@link setstate}` — Set the turtle's position, heading angle and/or pen state
* `{@link reset}` — Completetly reset the turtle to its original state
* `{@link resetstate}` — Reset the turtle's state
* `{@link resetmatrix}` — Reset the turtle's transformation matrix

### Markings

* `{@link show}` — Draw the turtle at its current position and heading
* `{@link mark}` — Draw a small + at the turtle's current position independent of heading
* `{@link setturtlefunction}` — Set a custom function that draws the turtle when using `{@link show}`
* `{@link setmarkfunction}` — Set a custom function that draws the mark when using `{@link mark}`

### Utilities

* `{@link repeat}` — Repeat a function a number of times
* `{@link foreach}` — Call a function for each element of an array
* `{@link breakout}` — Break out of a {@link repeat} or {@link foreach} loop
* `{@link range}` — Get a sequence of numbers for use in loops (like {@link foreach} and [<code>for...of</code>]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of})
* `{@link type}` — Determine the type of any value

### Plotting

* `{@link plotter}` — Get the {@link Plotter} object, containing all the functions to control plotting your turtle graphics

### Transformations

* `{@link translate}` — Translate the coordinate system
* `{@link rotate}` — Rotate the coordinate system
* `{@link scale}` — Scale the coordinate system

### State Stacks

* `{@link push}` — Push the turtle's state and transformation matrix onto the stack
* `{@link pushstate}` — Push the turtle's state onto the stack
* `{@link pushmatrix}` — Push the current transformation matrix onto the stack
* `{@link pop}` — Restore the last pushed turtle state and transformation matrix from the stack
* `{@link popstate}` — Restore the last pushed turtle state from the stack
* `{@link popmatrix}` — Restore the last pushed transformation matrix from the stack

### Turtle Objects

* `{@link newturtle}` — Create a new turtle object
* `{@link self}` — Get the turtle object itself
* `{@link clone}` — Get a copy of the turtle object
* `{@link isturtle}` — Check whether an object is a turtle or not