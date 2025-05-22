
# Cosmic Canvas 3D

An interactive 3D universe simulation built with React, Three.js, and Tailwind CSS. Explore a dynamic environment filled with randomly generated galaxies, each with unique characteristics, rotations, and colors.

## Features

*   **Procedurally Generated Universe:** Each session creates a unique universe with a configurable number of galaxies.
*   **Detailed Galaxies:** Galaxies feature spiral arms, distinct core and arm colors, nebula regions, and dust clouds/lanes.
*   **Dynamic Controls:**
    *   Adjust the number of galaxies.
    *   Control the overall spread/volume of the universe.
    *   Modify the global speed multiplier for galaxy orbits (rotation around their own center).
    *   Modify the global speed multiplier for internal arm/star system rotation within galaxies.
    *   Re-generate the entire set of galaxies with new random properties.
    *   Trigger a "Disintegration Universe" event where all galaxies dramatically fly towards the camera, scale up, fade out, and disappear with random delays and explosive effects.
*   **Interactive 3D Navigation:** Use mouse drag to orbit the camera around the universe. Zoom in and out with the scroll wheel.
*   **Responsive UI:** Controls are styled with Tailwind CSS and are responsive.
*   **Background Starfield:** A distant starfield adds depth to the cosmic scene.

## Technologies Used

*   **React 19:** For building the user interface and managing component state.
*   **Three.js (r176):** For 3D rendering, particle systems, and scene management.
*   **Tailwind CSS:** For styling the UI components.
*   **TypeScript:** For type safety and improved developer experience.
*   **ESM via esm.sh:** For direct browser imports of React and Three.js modules.

## How to Run

1.  **Clone the repository (or download the files):**
    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```
2.  **Open `index.html` in your web browser:**
    *   You can usually just double-click the `index.html` file.
    *   Alternatively, you can serve the project directory using a simple HTTP server (e.g., `npx serve .` or Python's `http.server`).

No build process is required for the current setup as it relies on browser-native ES modules and CDNs/esm.sh for dependencies.

## Controls & Interactions

*   **Mouse Drag (Left Button):** Orbit the camera around the center of the universe.
*   **Mouse Scroll Wheel:** Zoom in and out.
*   **UI Controls (Top Panel):**
    *   **Galaxy Orbit Speed:** Adjusts how fast each galaxy rotates around its own axis.
    *   **Arm Internal Speed:** Adjusts how fast the stars/dust within each galaxy rotate (spiral arm spin).
    *   **Universe Spread:** Controls the volume in which galaxies are scattered and adjusts the camera's far viewing distance and background starfield size.
    *   **Number of Galaxies:** Sets how many galaxies are generated in the universe. Changing this will re-generate the universe.
    *   **Re-generate Galaxies Button:** Creates a new set of random galaxies with the current "Number of Galaxies".
    *   **Disintegrate Universe Button:** Triggers an animation where all galaxies explode towards the camera and vanish.

## Project Structure

*   `index.html`: The main HTML entry point.
*   `metadata.json`: Application metadata.
*   `README.md`: This file.
*   `src/`: Contains all source code.
    *   `index.tsx`: React application root.
    *   `App.tsx`: Main React component containing UI controls and the `ThreeScene`.
    *   `components/`: Contains React components.
        *   `ThreeScene.tsx`: The core component responsible for all Three.js rendering and logic.
        *   `galaxyUtils.ts`: Helper functions for generating galaxy parameters and structures.

## Future Enhancements (Ideas)

*   **More Galaxy Types:** Introduce elliptical, irregular, or barred spiral galaxies.
*   **Performance Optimization:** Implement GPU-based particle systems or instancing for even larger numbers of particles/galaxies.
*   **Advanced Camera Controls:** Add options for cinematic camera paths or a "fly-through" mode.
*   **Interactive Galaxy Selection:** Allow users to click on a galaxy to focus on it or see its specific properties.
*   **Persistent Settings:** Save user control preferences using `localStorage`.
*   **Further Refactoring:**
    *   Break down `ThreeScene.tsx` into smaller, more manageable custom React hooks (e.g., `useThreeSetup`, `useGalaxyManager`, `useBackgroundStars`).
    *   Move type definitions to a dedicated `types.ts` file.
    *   Centralize configurable constants (colors, particle counts, etc.) in a `config.ts` file.

## License

This project is licensed under the MIT License - see the LICENSE file for details (if one is added). For now, consider it open for personal use and learning.
    