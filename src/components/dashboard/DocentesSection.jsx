import React, { useState } from 'react';
import { Search, UserCheck, GraduationCap } from 'lucide-react';

export function DocentesSection({ teachers }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Convert teachers object into an array of { grupo, docente }
  const teacherList = Object.entries(teachers || {}).map(([grupo, docente]) => ({
    grupo: grupo || '',
    docente: typeof docente === 'object' ? (docente?.nombre || '') : (docente || ''),
  }));

  // Filter teachers by name or group
  const filteredTeachers = teacherList.filter(
    (item) =>
      item.docente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.grupo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-[#182234] rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden transition-colors duration-200">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
            <UserCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              Docentes
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                {teacherList.length}
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Profesores a cargo de grupo
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar docente o grupo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-[#0F172A]/70 border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white placeholder-gray-400 transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Teachers List / Table */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
        {filteredTeachers.length > 0 ? (
          filteredTeachers.map((item, idx) => (
            <div
              key={item.grupo || idx}
              className="p-3.5 px-5 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
            >
              {/* Teacher Info & Avatar */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/20 shadow-sm">
                  {item.docente
                    .replace(/Profesora\.|Profesor\.|Profesora|Profesor|Profra\.|Prof\./gi, '')
                    .trim()
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {item.docente}
                  </h4>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    Titular de grupo
                  </span>
                </div>
              </div>

              {/* Group Assigned Pill Badge */}
              <div className="flex items-center">
                <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 text-xs font-black tracking-wide shadow-xs">
                  {item.grupo}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500">
            No se encontraron docentes coincidentes.
          </div>
        )}
      </div>
    </div>
  );
}
