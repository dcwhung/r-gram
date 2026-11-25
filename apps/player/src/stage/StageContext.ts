import { createContext, useContext } from 'react';
import { fitStage, type StageFit } from './fitStage';

/** 預設值 = 設計尺寸（1080 × 1920）：元件喺 <Stage> 以外 render（例如單元測試）都有合理嘅數 */
export const StageContext = createContext<StageFit>(fitStage(0, 0));

/** 舞台而家嘅縮放同高度（設計單位）。底部對齊嘅元件用 `extraUnits` 向下移 */
export const useStageFitContext = (): StageFit => useContext(StageContext);
