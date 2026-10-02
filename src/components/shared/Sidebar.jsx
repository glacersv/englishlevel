import React from 'react'

export default function Sidebar({
  title,
  subtitle,
  icon = 'school',
  menuItems = [],
  activeKey,
  onSelect,
  collapsed,
  onToggleCollapse,
  user,
  onLogout
}) {
  return (
    <aside
      className={`bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col justify-between transition-all duration-300 z-40 shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Encabezado del Sidebar */}
      <div>
        <div className="h-16 px-4 border-b border-outline-variant/30 flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
              </div>
              <div className="flex flex-col truncate">
                <span className="font-heading font-extrabold text-sm text-on-surface leading-tight truncate">
                  {title}
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium truncate">
                  Colegio Salesiano San José
                </span>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 mx-auto rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir barra' : 'Colapsar barra'}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">
              {collapsed ? 'last_page' : 'first_page'}
            </span>
          </button>
        </div>

        {/* Lista de Navegación */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeKey === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all relative ${
                  isActive
                    ? 'bg-primary text-white shadow-sm font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                } ${collapsed ? 'justify-center px-0' : 'justify-start'}`}
                title={collapsed ? item.label : undefined}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    isActive ? 'text-white fill' : 'text-on-surface-variant'
                  }`}
                >
                  {item.icon}
                </span>

                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {!collapsed && item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-primary-fixed text-on-primary-fixed'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Pie del Sidebar: Usuario & Logout */}
      <div className="p-3 border-t border-outline-variant/30 space-y-2">
        <div className={`flex items-center gap-2 p-2 rounded-xl bg-surface-container-low ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs shrink-0">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate flex-1">
              <span className="text-xs font-bold text-on-surface truncate leading-tight">
                {user?.name || 'Usuario'}
              </span>
              <span className="text-[10px] text-on-surface-variant truncate">
                {user?.email || 'Institucional'}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-error hover:bg-error-container/40 transition-all ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Cerrar sesión"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  )
}
