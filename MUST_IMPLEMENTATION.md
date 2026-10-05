# Must-have coverage

Source: USER REQUIREMENTS (1).pdf, using its MoSCoW priorities and the user's
subsequent decisions: no AHN/GPS, fixed size, non-LiDAR iPhone 15, phone bottom-edge
ground contact, and Musts first.

| ID | Implementation | Acceptance |
| --- | --- | --- |
| F1 | iPhone ARKit/Viro development build, no LiDAR path | Physical iPhone 15+ test pending |
| F2 | Fixed 6 × 3 m footprint at 1:1 AR scale | Geometry tested; physical scale check pending |
| F3 | Full-screen AR camera | Device test pending |
| F4 | Drag/translate and yaw controls before final lock | Reducer tested; gesture test pending |
| F6 | Final placement lock blocks movement and rotation | Tested |
| F7 | Guided six camera captures; relative heights and estimated local 3D contact points | Math/quality tested; physical error measurement pending |
| F10 | Existing manual ground point selection retained | State tests pass; device test pending |
| F12 | Coordinate, distance, footprint and result UI in cm | Typecheck/export; visual device check pending |
| NF3 | Constant-colour markings, contrast feedback and daylight scanning instructions | Daylight acceptance pending |
| NF4 | Three-step flow, six explicit captures, two-second stable windows | Under-three-minute timing pending |
| NF5 | Numbered/highlighted points, progressive instructions and live quality feedback | Device usability check pending |

F7 is an approximate AR measurement implementation, not surveyed coordinates.
The first selected ground Y is the height datum. Relative camera heights cancel
the unknown vertical camera-to-edge offset when contact posture is consistent.
Captured camera X/Z approximate horizontal contact position; nominal footprint
points remain separate in state. No external geographic/elevation data is used.

Should/Could features are deferred: photos, 3D volume, suitability classification,
additional automation and verified ±5 cm accuracy. No GPS/AHN service, location
dependency or location plugin remains. Current code does not claim container
fit/safety approval from six contact samples.
