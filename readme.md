# easy-pipeline
> Framework for building pipelines in node.

## Supported node versions
This library is written using ES 2015 features. Therefore it can only be 
used in node 6.4.0+. 

If you need to run it in an older version of node, code should be transpiled
first.

## Install
```sh
npm install easy-pipeline
```

## Features
- Create pipeline stages as functions.
- Safer execution environment which prevents the output of function being modified.
- Extensible logging framework to capture the input and output of each function.

## Stages
Stages are the fundamental building blocks of a pipeline. 
It's defined by a function that receives a single argument - context and 
returns an arbitary object representing the output.

```javascript
// Simple stage that returns an object with a property called foo.
const stageFoo = context = ( { foo: 'a' });

// Another stage that return an object with a property called bar.
const stageBar = context = ( { bar: 'b' });
```

Once we have the stages, we can call ```createPipeline``` function to bind them 
together to create a pipeline. 

```javascript
const createPipeline = require('easy-pipeline');

const pipeline = createPipeline(stageFoo, stageBar);
```

Finally the pipeline can be invoked by providing the initial input (optional).

```javascript
pipeline();
```

Result of the pipline would be the combination of return values from stageFoo 
and stageBar.

```javascript
{ foo: 'a', bar: 'b' }
```

### Accessing the results of a stage from another
Our pipeline would be little useful if we could not access the result of 
one stage from another. ```Context``` argument passed into each stage provides
access various useful services including the results of previous stages.

Let's modified our ```barStage``` to return a value based on the previous stage.

```javascript
const barStage = context = ({ bar: `${context.props.foo}-b`});
```

This time around, the result of our pipeline would be:
```
{ foo: 'a', bar: 'a-b' }
```

### Safety of props
```context.props``` received by a stage is an immutable object. If a stage
accidently attempts to modify the output from another, it will result in an error.

```javascript
const barStage = context => {
  context.props.foo = 'c'; // Receives a type error.
};
```

### Stage name
Each stage has a name. This is used within various logging operations 
(discussed below). By default the stage name is same as the function name. 
We can modify this by attaching a config property to our stage function.

```javascript
const barStage = context => ( { bar: 'b' });
barStage.config = { name: 'my-bar-stage' };
```

This feature can be useful if we want to have more elaborate names for our 
stages or if we are running on node 6.4.0 where function name property is 
not available for certain types of expressions (http://node.green/#ES2015-built-in-extensions-function--name--property). 

### Asynchronous stages
We can choose between two flavours of asynchrnous stages.

First one is with a stage function can accept an additional argument 
for a callback function that can be called at the end of an asynchronous 
function to signify the success or failure.

```javascript
const fs = require('fs');

const readFileStage = (context, cb) => {
  fs.readFile('/etc/passwd', (err, data) => {
    if (err) {
      cb(err);
    } else {
      cb(null, { file: data });
    }
  });
};

const pipeline = createPipeline(readFileStage);
pipeline();

// returns: { file: 'content of /etc/passwd' }
``` 

Other option is a stage function that returns a ```Promise```.

```javascript
const asyncStage = context => {
  return new Promise((resolve, reject) => {
    // ...
  });
};

const pipeline = createPipeline(asyncStage);
pipeline();

```

## Pipeline API
### as
Specify a meaningful name to a pipeline. It's used by the loggers when 
logging pipeline activities.

```javascript
const p = createPipeline(stage1, stage2).as('my-awesome-pipeline');
p();
```

## Logging
There is a defined logger which has been integrated into the context, the default levels are :
- debug
- info 
- warn
- error

To use the logger you just need to invoke the level on the context
```
context.log.debug(<data object>);
```