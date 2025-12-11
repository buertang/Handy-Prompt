import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';

// 使用 React.lazy 按需加载设置页主体，减少主入口体积
const App = lazy(() => import('./App'));

// 获取根DOM元素并渲染React应用
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <Suspense fallback={<div style={{padding: 16}}>设置加载中...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);