#Shape morphing SVG paths with D3.js

A simple script to morph SVG paths while using control points to map the morphing transition.

##What does it do?

* morph one SVG path into another
* the paths can have different number of points
* an arbitrary number of control points can be defined to closely control the morphing
* control points can be any point on the shape, not limited to path segment points
* the precision of converting the shape into vertices can be adjusted
* easing and reverse supported
* helper method to visually identify starting and end points of path segments
* helper method to visually check whether control points are correctly defined

##Limitations

* only works on closed paths without holes
* controlPoints should be defined in a consecutive cw order and each control point from one shape is mapped onto the control point at the same index of the other shape
* each shape must have the same number of control points
* works, but not tested extensively

##How does it work?

Each shape is converted in vertices, these vertices are then put in the same direction (CW) and the control points are looked up into the vertices.
Next step is matching the number of points between the control points. The longest path is taken as reference and for the shortest path new points are calculated to match the number of points of the longest path.
The algorithm makes sure the relative distances between the points are the same in both paths, thus ensuring that the shape is properly mapped. Finally a linear interpolator is created for each point.

##How to use
The examples show the working of the script.
