"use client";

import React, { useState, ReactNode } from "react";

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

const useTabs = () => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("useTabs must be used within a Tabs component");
  }
  return context;
};

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value: initialValue, defaultValue, onValueChange, children, className = "" }, ref) => {
    const [value, setValue] = useState(initialValue ?? defaultValue ?? "");

    const handleValueChange = (newValue: string) => {
      setValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
        <div ref={ref} className={className}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = "Tabs";

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ children, className = "" }, ref) => (
    <div
      ref={ref}
      className={`inline-flex h-auto items-center justify-center rounded-2xl bg-black/[.04] p-1 ${className}`}
    >
      {children}
    </div>
  )
);
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, children, className = "" }, ref) => {
    const { value: activeValue, onValueChange } = useTabs();
    const isActive = activeValue === value;

    return (
      <button
        ref={ref}
        onClick={() => onValueChange(value)}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          isActive
            ? "bg-foreground text-background shadow-sm scale-[1.02]"
            : "text-muted-foreground hover:text-foreground hover:bg-black/[.03]"
        } ${className}`}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, children, className = "" }, ref) => {
    const { value: activeValue } = useTabs();

    if (activeValue !== value) return null;

    return (
      <div 
        ref={ref} 
        className={`mt-2 focus-visible:outline-none ${className}`}
        style={{
          animation: "fadeIn 0.3s ease-in-out",
        }}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = "TabsContent";
