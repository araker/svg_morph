#Shape morphing SVG paths with D3.js

A simple script to morph SVG paths while using control points to map the morphing transition.

Source code on github

##What does it do?

* morph one SVG path into another
* the paths can have different number of points, paths can have a CW (Clock Wise) or CCW (Counter Clock Wise) winding
* an arbitrary number of control points can be defined to closely control the morphing
* control points can be any point on the shape, not limited to path segment points
* the precision of converting the shape into vertices can be adjusted
* easing and reverse supported
* helper method to visually identify starting and end points of path segments
* helper method to visually check whether control points are correctly defined

##Limitations

* only works on closed paths without holes
* controlPoints should be defined in a consecutive CW order and each control point from one shape is mapped onto the control point at the same index of the other shape
* each shape must have the same number of control points
* shapes are not automatically aligned on each other, use a editor (i.e. svg edit) to make sure the shapes align
* works, but not tested extensively

##Dependencies

* D3.js for the animation tween
* polyfill for removed SVG path functionality (will change to newer methods from v2 spec once there is enough browser support)

##Improvements (To do)
* code optimizations
* split into a d3 plugin version and a standalone version (with a minimal d3.js lib or another framework for the transition)
* better helper methods for easily determining the control points
* shape alignment
* chained morphing effects
* doxygen style comments in source

##How does it work?

Each shape is converted in vertices, these vertices are then put in the same direction (CW) and the control points are looked up into the vertices.
Next step is matching the number of points between the control points. The longest path is taken as reference and for the shortest path new points are calculated to match the number of points of the longest path.
The algorithm makes sure the relative distances between the points are the same in both paths, thus ensuring that the shape is properly mapped. Finally a linear interpolator is created for each point.

##Basic usage

###steps
* take 2 SVG Paths
* determine the control points, look at the examples how to use the helper methods if necessary
* initialize the utility
* start the animation

###minimum code example
`
//presumes there is already a svg present in the page and that the path has a class named 'myPath'
var fromPath = 'M4.898587196589413e-15,-80A80,80 0 1,1 -80,9.797174393178826e-15L-60,7.34788079488412e-15A60,60 0 1,0 3.67394039744206e-15,-60Z',
    toPath = 'M3.061616997868383e-15,-50A50,50 0 0,1 3.061616997868383e-15,50L1.83697019872103e-15,30A30,30 0 0,0 1.83697019872103e-15,-30Z',
    d3ElementInDOM = d3.select('.myPath'),
    controlPointsFromShape = [{x:0,y:0}],
    controlPointsToShape = [{x:0,y:0}],
    duration = 1000,
    delay = 0,
    ease = 'ease-out' //can choose from all d3 ease functions
    callFunctionOnEnd = exampleFunction;

var morphInstance = getNewMorphInstance();
morphInstance.initialize();
morphInstance.initialize(4,fromPath, toPath, d3ElementInDOM, {points:controlPointsFromShape}, {points:controlPointsToShape});
morphInstance.startTransition(duration, delay,ease,callFunctionOnEnd);

exampleFunction = function()
{
    console.log("animation finished");
}
`

Look at the examples for more elaborate uses

##Changelog

###v0.1

Basic functionality works, helper classes work as intended, CW and CCW paths can be used. Code needs some performance optimizations
