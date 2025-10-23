# csvhorse

csvhorse generates CSV files from simple recipes typed in the left-hand pane. CSV output appears on the right when the recipe is run. There is support for variables and functions for counting, random numbers, Lorem Ipsum, dates, and more ...

Try CSVhorse online at https://csvhorse.mcglashan.net/

## Changelog

### version 0.2.8
- Help tray now complete, but maybe not finished.

### version 0.2.7
- Window resizing and scrollpane dragging has been overhauled.

### version 0.2.6
* Appearance tweak for the run button.
* Example is no longer a stringhorse example.
* Removed all the href="#" for something better.

### version 0.2.5
* Finally, a good icon!

### version 0.2.4
* Tidied up some redundant code carried over from stringhorse.
* The Run button really belongs to the recipe pane since you're running the recipe ... :|

### version 0.2.3
* New separator directive can override the ',' separator between columns to make e.g. semi-colon separated value files (SCSV?)
* Any separators detected in strings result in "wrapping" and "-escaping of the string.

### version 0.2.2
* time() function added with various randomisations and a sequence option.
* Leading zeroes are inserted on date numerals if month names aren't being used.
* Split recipe.js into smaller JS files
* seed directive can be used to seed the random number generator, giving you the same output each time.

### version 0.2.1
* date() function added with formatting and arithmetic options similar to count().

### version 0.2
* Pre-alpha status
* Row and column directives
* Handles strings
* Generates random numbers, lorem ipsum
* Support for stringhorse patterns
* Randomly blank cells and rows
* Cells have headers
* Crap icon
* No help or anything in the tray
* No date or time support
* No comma-safety for strings including commas

### version 0.0.1
* The start
