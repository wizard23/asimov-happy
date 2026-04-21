(full chat with chatgpt is here: https://chatgpt.com/share/69e78d69-0368-8385-938f-a9eadeb674e3)
## Prompt 1: would it be possible to train a kohonen net with julia sets?
## Prompt 2: I always wondered why julia sets don't use a logarithmic "palette"
## Actual prompt for spec creation
Please (in a canvas so we can refine) create the specs for a julia set kohonen map pure frontend webapp. 

User can set parameters for 
* size of kohonen net (default: 32x32) 
* kohonen net topology: 
  * squares 
  * hexagons 
* iterations of julia sets 
* size of feature vector (width and height of julia set feature vector in grayscale pixel normalized from 0 to 1 with a logarithmic scale as we discussed) 
* training rounds 
* random seed 

the kohonen nets ae trained with gray scale representations of the julia set ensure that with the same settings and the same random seed exactly the same kohonen net gets trained. 
Use XORshift128 for deterministic random numbers.

The result should be shown as either a square or a hex grid. 
When the user clicks on one of the kohonen cells the julia set viewer next to the kohonen net shows the julia set clicked. 
Linearly interpolate between the points smoothly.

There are also some settings purely for the visualization of the julia sets (these don't get used for training the kohonen net and so can be adjusted at any point) 
* iterations for the visualization