# What Each SOM Cell Represents

## Short answer

No. In this app, a SOM cell does **not** primarily represent "one fixed coordinate in the complex plane".

Each cell mainly represents:

- one position in the **SOM grid**
- one learned **prototype vector** in feature space
- optionally one **representative Julia parameter** chosen after training as the closest real sample to that prototype

So the cell is first a neuron with a learned grayscale feature pattern. The complex-plane coordinate shown for that cell is a convenient representative sample, not the cell's true internal identity.

## The three spaces that matter

To understand this cleanly, it helps to separate three different spaces:

### 1. SOM grid space

This is the 2D map layout, for example a `6 x 6` grid.

Each cell has a grid coordinate like:

- `(x=0, y=0)`
- `(x=4, y=2)`
- `(x=5, y=5)`

These coordinates tell you where the neuron sits in the map topology and which other neurons are its neighbors.

They do **not** tell you where the neuron is in the Julia complex plane.

### 2. Feature space

This is the high-dimensional numeric space in which training actually happens.

In this app, each training sample is a grayscale Julia image flattened into a vector.

Examples:

- `32 x 32` feature image -> `1024` dimensions
- `200 x 200` feature image -> `40000` dimensions

During training, each SOM cell stores a prototype vector of exactly that length.

That prototype vector is the main thing the neuron learns.

### 3. Julia parameter space / complex plane

Each original training sample is generated from one complex parameter `c = a + bi`.

That parameter is a point in the complex plane.

So:

- training samples come from complex-plane points
- samples are converted into feature vectors
- SOM cells learn prototype vectors from those feature vectors

This means the complex plane is the **source** of the data, but the SOM is trained in feature space.

## What a cell contains in this app

A trained cell contains:

- `x`, `y`: its location in the map grid
- `prototypeVector`: the learned high-dimensional weight vector
- `representativeSampleIndex`: which real sample ended up closest to that prototype after training
- `representativeParameter`: the complex parameter of that closest real sample

So the cell's most important learned value is `prototypeVector`.

The representative parameter is assigned later so the app can show a concrete Julia set for the cell.

## What training actually does

For each training sample:

1. The app generates a Julia-set feature vector from some complex parameter `c`.
2. It finds the cell whose prototype vector is closest to that sample vector.
3. That cell is the BMU: Best Matching Unit.
4. The BMU and nearby cells are nudged toward the sample vector.

Over many updates, nearby cells become similar to similar Julia morphologies.

So a cell becomes a kind of "prototype neuron for a region of feature space", not a stored complex coordinate.

## Why the app can still show a complex parameter for a cell

After training, the app looks through the real samples and finds which one is closest to each learned prototype vector.

That closest real sample becomes the representative for the cell.

This is useful because a learned prototype vector is just a grayscale numeric pattern. It may not correspond exactly to a clean mathematically valid Julia set.

By attaching the nearest real training sample, the app can say:

- "this cell is best represented by sample #123"
- "that sample came from parameter `c = -0.74 + 0.12i`"

That is why clicking a cell can show a real Julia set in the viewer.

## So does the cell represent one complex-plane coordinate?

The precise answer is:

- **Not intrinsically**
- **Only indirectly through an assigned representative sample**

If you want the most correct wording:

> A SOM cell represents a learned prototype in feature space, and the app may associate it with one representative complex parameter from the nearest real sample.

That is much more accurate than saying:

> each cell is one coordinate in the complex plane

## Why neighboring cells still often correspond to nearby visual families

Even though the cells are not complex-plane coordinates, neighboring cells often show related Julia sets because SOM training preserves neighborhood structure.

That means:

- visually similar feature vectors tend to end up near each other on the map
- abrupt visual changes tend to be farther apart

So the SOM grid becomes a low-dimensional organization of morphology, not a literal copy of the complex plane.

Sometimes neighboring cells may also correspond to nearby complex parameters, but that is a consequence of the data and training, not the definition of the map.

## Important intuition

You can think of one cell like this:

"This neuron specializes in Julia images that look roughly like this pattern."

Not:

"This neuron permanently stores the complex number `a + bi`."

## Analogy

Imagine training a SOM on photos of animals.

Each cell would not represent one physical latitude/longitude location on Earth.
Instead, each cell would represent a learned visual prototype such as:

- cat-like faces
- long-neck bird-like shapes
- striped mammal textures

You could attach one example photo to each cell afterward, but the cell itself is still a prototype neuron, not the photo file.

The Julia case is the same:

- the prototype is learned from image features
- the representative parameter is just one attached example

## In this specific app

In this project, the map panel draws the cell's learned `prototypeVector`.
The larger Julia viewer uses the cell's `representativeParameter` to render a real Julia set.

So the map view and the large viewer are showing related but not identical concepts:

- map thumbnail: learned prototype
- big viewer: real Julia render from the representative sample's complex parameter

## Final summary

Each SOM cell in this app represents:

1. a neuron at a specific grid location
2. a learned prototype vector in grayscale Julia-feature space
3. a representative real sample and complex parameter attached after training for inspection

So the best conceptual model is:

**A cell represents a learned visual/morphological prototype, not a fixed complex-plane coordinate.**
