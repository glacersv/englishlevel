import React from 'react'
import iconNextApp from '../../assets/icon_next_app.png'

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
  onLogout,
  logoutLabel = 'Cerrar Sesión',
  collapseTooltip = 'Colapsar barra',
  expandTooltip = 'Expandir barra'
}) {
  return (
    <aside
      className={`bg-white border-r border-[#eceaf6] flex flex-col justify-between transition-all duration-300 z-40 shrink-0 shadow-xs ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Encabezado del Sidebar */}
      <div>
        <div className="h-20 px-4 border-b border-[#eceaf6]/70 flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#eceaf6] p-1 flex items-center justify-center shadow-xs shrink-0">
                <img
                  src={iconNextApp}
                  alt="Next Plus"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col truncate">
                <span className="font-heading font-extrabold text-sm text-[#2d2c38] tracking-tight leading-tight truncate">
                  {title}
                </span>
                <span className="text-[11px] text-[#8e8a9f] font-medium truncate">
                  Colegio San José
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex items-center justify-center">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#eceaf6] p-1 flex items-center justify-center shadow-xs">
                <img
                  src={iconNextApp}
                  alt="Next Plus"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? expandTooltip : collapseTooltip}
            className="p-1.5 rounded-xl text-[#8e8a9f] hover:bg-[#f4f1fd] hover:text-[#8a70d6] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[19px]">
              {collapsed ? 'last_page' : 'first_page'}
            </span>
          </button>
        </div>

        {/* Lista de Navegación */}
        <nav className="p-3.5 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = activeKey === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer relative ${
                  isActive
                    ? 'bg-[#e9e3ff] text-[#5446a8] shadow-xs ring-1 ring-[#8a70d6]/20'
                    : 'text-[#585567] hover:bg-[#f8f7fc] hover:text-[#2d2c38]'
                } ${collapsed ? 'justify-center px-0' : 'justify-start'}`}
                title={collapsed ? item.label : undefined}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isActive ? 'bg-white text-[#8a70d6] shadow-xs' : 'text-[#8e8a9f]'
                }`}>
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? 'fill' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                </div>

                {!collapsed && (
                  <span className="truncate flex-1 text-left tracking-wide">{item.label}</span>
                )}

                {!collapsed && item.badge && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-tight ${
                      isActive
                        ? 'bg-[#8a70d6] text-white shadow-xs'
                        : 'bg-[#f4f1fd] text-[#8a70d6]'
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

      {/* Pie del Sidebar: Tarjeta de Acceso y Usuario */}
      <div className="p-3.5 border-t border-[#eceaf6]/70 space-y-3">
        {/* Banner estilo Academy */}
        {!collapsed && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#f4f1fd] to-[#e9e3ff] border border-[#e2e0ed]/80 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8a70d6] animate-pulse"></span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5446a8]">
                Panel Activo 2026
              </span>
            </div>
            <p className="text-[11px] text-[#585567] font-medium leading-tight">
              Nivelación diagnóstica en vivo
            </p>
          </div>
        )}

        <div className={`flex items-center gap-2.5 p-2 rounded-2xl bg-[#f8f7fc] border border-[#eceaf6] ${collapsed ? 'justify-center' : ''}`}>
          {user?.photoUrl ? (
            <img
              src={user.photoUrl}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
              alt={user?.name || 'Usuario'}
              className="w-9 h-9 rounded-xl object-cover shrink-0 ring-2 ring-[#8a70d6]/30 shadow-xs"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8a70d6] to-[#a48ff0] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col truncate flex-1">
              <span className="text-xs font-bold text-[#2d2c38] truncate leading-tight">
                {user?.name || 'Administrador'}
              </span>
              <span className="text-[10px] text-[#8e8a9f] truncate">
                {user?.email || 'admin@san-jose.edu.sv'}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
          title={logoutLabel}
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          {!collapsed && <span>{logoutLabel}</span>}
        </button>
      </div>
    </aside>
  )
}
