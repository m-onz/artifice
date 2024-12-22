
# artifice

<img src="images/1.png" loading="defer" />
<img src="images/2.png" loading="defer" />

### about

using generative ai image-to-video ML to hallucinate extended video sequences from a single source image.

you will need an API key from [replicate.com](https://replicate.com)  exported as an environment variable.

### dependencies

tested on [debian linux](https://www.debian.org/)

this requires [ffmpeg](https://ffmpeg.org/)

this costs money to run *see [replicate.com](https://replicate.com) pricing

put your images in the ./images folder. mp4 output is in the output folder.

```sh
sudo apt-get install ffmpeg
git clone https://github.com/m-onz/artifice
npm i
export REPLICATE_API_TOKEN=r8_BRU**********************************
node hallucinate.js
```

wait a long time!

### generating initial images

You can add images to the `images` folder from any source. I used [this model](https://replicate.com/bamburaistudio/paper-texture)

With the prompt:

```
shocking abstract 3D art in the style of andy warhol and francis bacon for a gallery that shocks the viewer exploring digital, glitch and modern culture, distorted abstract wireframe mesh forms
```

### generate gifs

You can use [this model](https://replicate.com/fofr/toolkit) to generate a .gif from an .mp4 video.

### an example video

You can see an example video of this output [here](https://m-onz.net/art)

## models

* Updated to use [/minimax/video-01](https://replicate.com/minimax/video-01) for 6 second video image-to-video generation
* You can use a [text-to-image](https://replicate.com/bytedance/sdxl-lightning-4step) model to generate initial images.. or use any image you like


