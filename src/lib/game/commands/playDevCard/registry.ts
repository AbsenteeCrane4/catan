import { DevCardRegistry } from "./types";
import { applyYearOfPlenty } from "./yearOfPlenty";
import { applyMonopoly } from "./monopoly";
import { applyRoadBuilding } from "./roadBuilding";
import { applyKnight } from "./knight";

export const devCardRegistry: DevCardRegistry = {
  yearOfPlenty: applyYearOfPlenty,
  monopoly: applyMonopoly,
  roadBuilding: applyRoadBuilding,
  knight: applyKnight,
};
