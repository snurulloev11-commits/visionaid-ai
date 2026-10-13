# VisionAid AI

VisionAid AI is a browser-based accessibility prototype built for **EurekaDev 2026**.

It allows a user to upload a photo or capture an image with a camera, identify everyday objects using a pre-trained computer-vision model, view a confidence score and alternative predictions, and hear the top result spoken aloud.

## Live demo

https://silly-typhoon-z461n.ship.place/

## Features

- Image upload
- Camera capture
- MobileViT object classification
- Confidence score
- Alternative predictions
- Text-to-speech result
- Client-side image processing
- Responsive accessibility-focused interface

## Built with

- HTML
- CSS
- JavaScript
- Transformers.js
- MobileViT
- Web Speech API
- MediaDevices / getUserMedia

## How it works

1. Transformers.js loads a pre-trained MobileViT model.
2. The user supplies an image by upload or camera capture.
3. MobileViT returns the top three ImageNet predictions.
4. VisionAid AI displays the highest-confidence result.
5. The browser can read the result aloud.

## Run locally

An internet connection is required to load Transformers.js and MobileViT from the CDN.

The public demo is served directly from the GitHub repository through jsDelivr, so no Replit credits or server deployment are required.

## Privacy

Images are processed in the browser. This prototype does not upload selected images to a custom server.

## Limitations

- MobileViT is a general ImageNet classifier and can make mistakes.
- Performance depends on lighting, image quality, and whether the object exists in its training classes.
- This prototype is not intended for navigation or safety-critical decisions.

## EurekaDev 2026

**Track:** Coding  
**Category:** Computer Science + AI / Social Good
