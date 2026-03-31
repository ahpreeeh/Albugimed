"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ViewType = 'cockpit' | 'subjects' | 'simulation' | 'planning';

interface ViewContextType {
    activeView: ViewType;
    setActiveView: (view: ViewType) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export const ViewProvider = ({ children }: { children: ReactNode }) => {
    const [activeView, setActiveView] = useState<ViewType>('cockpit');

    return (
        <ViewContext.Provider value={{ activeView, setActiveView }}>
            {children}
        </ViewContext.Provider>
    );
};

export const useView = () => {
    const context = useContext(ViewContext);
    if (context === undefined) {
        throw new Error('useView must be used within a ViewProvider');
    }
    return context;
};
