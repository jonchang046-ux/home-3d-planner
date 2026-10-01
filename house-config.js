import {validateHouse} from './house-validation.js';
import {openingsFor,wallPartsFor} from './house-geometry.js';
export let houseConfig,allRooms;
export function setHouse(config){validateHouse(config);houseConfig=config;allRooms=[...config.rooms,...config.balcony];}
export function openings(wall){return openingsFor(houseConfig,wall);}
export function wallParts(wall){return wallPartsFor(houseConfig,wall);}
