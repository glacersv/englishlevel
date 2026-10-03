import React, { useState } from 'react'
import teacherAvatarDefault from '../../assets/avatar_teacher.png'
import { registerOrUpdateUser } from '../../lib/dataService'

export default function TeacherProfile({ user, onProfileUpdated }) {
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '')
  const [specialty, setSpecialty] = useState(user?.specialty || 'Get Involved! (A1 - C1)')
  const [bio, setBio] = useState(user?.bio || '')
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Manejo de carga de foto con compresión automática a Canvas (evita superar límite de documento Firestore)
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg('')
    const reader = new FileReader()
    reader.onload = (evt) => {
      const img = new Image()
      img.onload = () => {
        // Redimensionar a máx 400x400 para un avatar perfecto y liviano (< 60 KB)
        const maxDim = 400
        let w = img.width
        let h = img.height
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)

        // Convertir a JPEG comprimido de alta definición
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)
        setPhotoUrl(compressedBase64)
      }
      img.onerror = () => {
        setErrorMsg('No se pudo procesar la imagen seleccionada.')
      }
      img.src = evt.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      const updatedData = {
        ...user,
        name: name.trim(),
        phone: phone.trim(),
        photoUrl: photoUrl,
        specialty: specialty.trim(),
        bio: bio.trim(),
        updatedAt: new Date().toISOString()
      }

      await registerOrUpdateUser(updatedData)
      setSaving(false)
      setSuccessMsg('✅ ¡Tus datos personales y foto de perfil han sido actualizados con éxito!')
      onProfileUpdated?.(updatedData)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      console.error('Error al actualizar perfil de docente:', err)
      setErrorMsg('Ocurrió un error al guardar los cambios: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Encabezado */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/30 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <img
              src={photoUrl || teacherAvatarDefault}
              alt={name || user.email}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/20 shadow-md bg-slate-100"
            />
            <label
              htmlFor="teacher-photo-input"
              className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold"
              title="Cambiar foto de perfil"
            >
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              <span>Cambiar</span>
            </label>
            <input
              id="teacher-photo-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Docente de Inglés Autorizado
              </span>
              <span className="text-xs text-gray-400">Colegio Salesiano San José</span>
            </div>
            <h1 className="font-heading font-extrabold text-2xl text-on-surface mt-1">
              {name || user.email}
            </h1>
            <p className="text-xs text-on-surface-variant font-mono mt-0.5">
              {user.email} <span className="text-gray-400">(Correo Institucional Protegido)</span>
            </p>
          </div>
        </div>

        <div className="text-center md:text-right bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Identificador Oficial</span>
          <span className="font-mono text-sm font-bold text-[#2528b7]">{user.id || 'DOC-CSSJ'}</span>
        </div>
      </div>

      {/* Formulario de Datos Personales */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/30 shadow-sm">
        <div className="border-b border-gray-100 pb-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-lg text-gray-900">Configuración de Perfil</h2>
            <p className="text-xs text-gray-500">
              Modifica tu nombre público, foto, número de contacto y notas personales. El correo institucional no se puede cambiar por seguridad.
            </p>
          </div>
          <span className="material-symbols-outlined text-[28px] text-primary/40">badge</span>
        </div>

        {successMsg && (
          <div className="p-4 mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nombre Completo */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                Nombre Completo (Visible para Alumnos y Actas)
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Ronald Cardona"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium transition-all"
              />
            </div>

            {/* Correo Institucional (Solo Lectura) */}
            <div>
              <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>Correo Institucional Microsoft 365</span>
                <span className="material-symbols-outlined text-[14px]" title="Campo protegido">lock</span>
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 font-mono text-sm cursor-not-allowed select-none"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                El correo institucional está sincronizado con Azure AD y no puede modificarse aquí.
              </span>
            </div>

            {/* Teléfono de Contacto */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                Teléfono / WhatsApp de Contacto
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. +503 7000-0000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium transition-all"
              />
            </div>

            {/* Especialidad / Asignación */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                Asignatura / Programa de Inglés
              </label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ej. Get Involved! Books L1-L3"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium transition-all"
              />
            </div>
          </div>

          {/* URL de Foto o Carga */}
          <div>
            <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Foto de Perfil</span>
              <label htmlFor="teacher-photo-input-2" className="text-primary hover:underline cursor-pointer font-bold text-xs normal-case flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">upload</span>
                Subir desde mi computadora
              </label>
            </label>
            <input
              id="teacher-photo-input-2"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="O pega aquí el enlace directo a tu fotografía (https://...)"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs font-mono transition-all"
              />
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Quitar foto personalizada"
                >
                  Restaurar por Defecto
                </button>
              )}
            </div>
          </div>

          {/* Biografía o Mensaje de Bienvenida a Estudiantes */}
          <div>
            <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
              Breve Presentación o Mensaje para la Evaluación
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ej. Bienvenidos a la prueba diagnóstica de nivelación. Responder con tranquilidad y de manera oral..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium transition-all"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-heading font-extrabold text-sm shadow-md shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Guardando Cambios...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Guardar Datos de Perfil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
