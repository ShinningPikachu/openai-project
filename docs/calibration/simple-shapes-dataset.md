# Simple-shape calibration checklist

Use this local checklist to calibrate circle, triangle, square, rectangle, and spoon-like silhouette detection on physical Android devices. Do not commit captured photos by default; record only the expected result, actual result, confidence, failure reason, and processing time.

| Target | Object | Expected | Actual | Confidence | Failure reason | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Circle | Mug base or lid | accepted |  |  |  |  |
| Circle | Oval object | rejected |  |  |  |  |
| Square | Box or card | accepted |  |  |  |  |
| Square | Long rectangle | rejected |  |  |  |  |
| Triangle | Sign or triangle tile | accepted |  |  |  |  |
| Rectangle | Card or book cover | accepted |  |  |  |  |
| Spoon-like | Spoon, ladle, or similarly shaped silhouette | accepted |  |  |  |  |
| Spoon-like rejection | Pen or uniform narrow object | rejected |  |  |  |  |
| Triangle | Circle | rejected |  |  |  |  |
| Any | Moderate uneven light or patterned background | accepted |  |  |  |  |
| Any | Slight rotation or a small interior occlusion | accepted |  |  |  |  |
| Any | Object outside center guide | rejected |  |  |  |  |
| Any | Multiple objects | rejected |  |  |  |  |
| Any | Very low-contrast or very dark scene | rejected |  |  |  |  |
