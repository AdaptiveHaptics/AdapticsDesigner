# Adaptics Designer

### An online graphical interface for creating and testing adaptive mid-air ultrasound haptic sensations.


### [Try it Online](https://adaptivehaptics.github.io/AdapticsDesigner/) | [Publication](#publication)

## Hardware Requirements
The Adaptics Designer is a web application that requires a compatible browser[^2] and a haptic device to provide real-time feedback. Hardware haptic playback is through the [Adaptics Engine](https://github.com/AdaptiveHaptics/AdapticsEngine), which is compatible with Ultraleap[^1] devices such as the [Ultraleap STRATOS Explore Development Kit](https://www.ultraleap.com/datasheets/STRATOS_Explore_Development_Kit_datasheet.pdf).

[^1]: https://www.ultraleap.com/ - Formerly known as Ultrahaptics.

[^2]: [Tested](https://github.com/AdaptiveHaptics/AdapticsDesigner/actions/workflows/playwright.yml) on Desktop Chrome and Firefox.

## Hosting Locally
The Adaptics Designer is a static web application that can be hosted on any web server (such as with GitHub Pages). To host it locally, clone this repository and then run
```bash
npm install
npm start
```

To enable real-time haptic feedback, you will also need to download and run the Adaptics Engine.
Please refer to the [Adaptics Engine repository](https://github.com/AdaptiveHaptics/AdapticsEngine) for more information.

## Publication
Kevin John, Yinan Li, and Hasti Seifi. 2024. AdapTics: A Toolkit for Creative Design and Integration of Real-Time Adaptive Mid-Air Ultrasound Tactons. In Proceedings of the CHI Conference on Human Factors in Computing Systems (CHI ’24), May 11–16, 2024, Honolulu, HI, USA. ACM, New York, NY, USA, 15 pages. https://doi.org/10.1145/3613904.3642090

## Contact

If there are any questions or bugs please feel free to make an issue on the GitHub and/or reach out via email (kevin.john‮&#64;‬asu&#46;edu).
