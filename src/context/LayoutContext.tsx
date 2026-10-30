import React, { createContext, useContext } from 'react';

/**
 * LayoutContext: cho biết giao diện đang ở chế độ PC mở rộng (sidebar + nội dung rộng) hay không.
 * Các view dùng `useLayout().isWide` để đổi bố cục (vd: bỏ giới hạn max-w, chia cột).
 */
interface LayoutContextValue {
  isWide: boolean;
}

const LayoutContext = createContext<LayoutContextValue>({ isWide: false });

export const LayoutProvider: React.FC<{ isWide: boolean; children: React.ReactNode }> = ({
  isWide,
  children,
}) => <LayoutContext.Provider value={{ isWide }}>{children}</LayoutContext.Provider>;

export const useLayout = (): LayoutContextValue => useContext(LayoutContext);

