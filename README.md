
# hallucinate

using generative ai image-to-video ML to hallucinate extended video sequences from a single source image.

you will need an API key from replicate.com exported as an environment variable.

tested on debian linux

uses ffmpeg

this costs money to run *see replicate.com pricing

put your images in the ./images folder. mp4 output is in the output folder.

```sh
sudo apt-get install ffmpeg
git clone https://github.com/m-onz/hallucinate
npm i
export REPLICATE_API_TOKEN=r8_BRU**********************************
node hallucinate.js
```

wait a long time!
