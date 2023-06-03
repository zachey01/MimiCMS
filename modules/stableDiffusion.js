const request = require("request");
require("dotenv").config();

const options = {
  method: "POST",
  url: "https://stablediffusionapi.com/api/v3/text2img",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    key: process.env.STABLE_DIFFUSION_API,
    prompt:
      "ultra realistic close up portrait ((beautiful pale cyberpunk female with heavy black eyeliner))",
    negative_prompt: null,
    width: "512",
    height: "512",
    samples: "1",
    num_inference_steps: "20",
    seed: null,
    guidance_scale: 7.5,
    safety_checker: "yes",
    multi_lingual: "no",
    panorama: "no",
    self_attention: "no",
    upscale: "no",
    embeddings_model: "embeddings_model_id",
    webhook: null,
    track_id: null,
  }),
};

request(options, function (error, response) {
  if (error) throw new Error(error);
  const responseData = JSON.parse(response.body);
  console.log(responseData.output);
});
