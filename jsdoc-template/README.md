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

### Internal

* `{@link _state}`
* `{@link _add_line_fn}`
* `{@link _rm_line_fn}`
