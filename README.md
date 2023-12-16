
# hallucinate

using generative ai image-to-video ML to hallucinate extended video sequences from a single source image.

you will need an API key from replicate.com exported to a global variable:

export REPLICATE_API_TOKEN=r8_BRU**********************************

tested on debian linux

uses ffmpeg

this costs money to run *see replicate.com pricing

```sh
sudo apt-get install ffmpeg
git clone https://github.com/m-onz/hallucinate
npm i
export REPLICATE_API_TOKEN=r8_BRU**********************************
node hallucinate.js
```

wait a long time!

You should then eventually get an "output.mp4" with a complete sequence.

this script does not do any clean up of generated files so you need to manually delete them.
