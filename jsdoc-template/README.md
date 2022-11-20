## How to set up

Include the following script tags in the `<head>` section of your `index.html`:

```html
<script src="https://sketch.process.studio/turtle-graphics/tg.mjs" type="module"></script>
<script src="https://sketch.process.studio/turtle-graphics/tg-plot.mjs" type="module"></script>
```

These scripts need to be included after `p5.js`, so your `index.html` should look something like this:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.5.0/p5.js"></script>
    <link rel="stylesheet" type="text/css" href="style.css">
    <meta charset="utf-8" />
    <script src="https://sketch.process.studio/turtle-graphics/tg.mjs" type="module"></script>
    <script src="https://sketch.process.studio/turtle-graphics/tg-plot.mjs" type="module"></script>
  </head>
  <body>
    <main>
    </main>
    <script src="sketch.js"></script>
  </body>
</html>

```

## The turtle coordinate system

* The turtle always starts at the origin, with coordinates (0, 0).
    * The origin is in the center of the p5.js canvas. Note that, this is different from p5.js, where the origin is in the top-left corner.
    * The x-axis goes from left to right. Negative values are left of the origin, positive values right (same as p5.js).
    * The y-axis goes from top to bottom. Negative values are above the origin, positive values below (same as p5.js).
* The turtle always starts with heading 0, which is up (or 'north').
    * The heading is measured in degrees, starting at the top and moving clockwise.
    * A heading of 90 is right (or 'east').
    * A heading of 180 is down (or 'south').
    * A heading of 270 is left (or 'west').
    * Note that negative values can also be used, these are measured counter-clockwise. For example: -90 is left, -180 is down, -270 is right.
    

## Functions by type

Here is an index to all functions, grouped by type:

### Basic

* `{@link forward}`
* `{@link back}`
* `{@link left}`
* `{@link right}`
* `{@link penup}`
* `{@link pendown}`

### Get state

* `{@link xy}`
* `{@link x}`
* `{@link y}`
* `{@link heading}`
* `{@link isdown}`
* `{@link isup}`
* `{@link state}`

### Get relative state

* `{@link bearing}`
* `{@link distance}`

### Set state

* `{@link setxy}`
* `{@link jumpxy}`
* `{@link setheading}`
* `{@link face}`
* `{@link setstate}`
* `{@link reset}`
* `{@link resetstate}`
* `{@link resetmatrix}`

### Markings

* `{@link show}`
* `{@link mark}`

### Util

* `{@link repeat}`

### Plotting

* `{@link plotter}`

### Transformations

* `{@link translate}`
* `{@link rotate}`
* `{@link scale}`

### State Stacks

* `{@link push}`
* `{@link pushstate}`
* `{@link pushmatrix}`
* `{@link pop}`
* `{@link popstate}`
* `{@link popmatrix}`

### Instance

* `{@link newturtle}`
* `{@link self}`
* `{@link clone}`