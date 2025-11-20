import React from 'react';

interface Permission {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

interface Permissions {
  products?: Permission;
  categories?: Permission;
  sales?: Permission;
  salesHistory?: Permission;
  orders?: Permission;
  expenses?: Permission;
  reports?: Permission;
  users?: Permission;
}

interface PermissionsEditorProps {
  value: Permissions;
  onChange: (permissions: Permissions) => void;
}

const modules = [
  { key: 'products', label: 'Produtos' },
  { key: 'categories', label: 'Categorias' },
  { key: 'sales', label: 'Vendas/PDV' },
  { key: 'salesHistory', label: 'Histórico de Vendas' },
  { key: 'orders', label: 'Pedidos/Comandas' },
  { key: 'expenses', label: 'Contas a Pagar' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'users', label: 'Usuários' },
];

const actions = [
  { key: 'view', label: 'Ver' },
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Deletar' },
];

export const PermissionsEditor: React.FC<PermissionsEditorProps> = ({ value, onChange }) => {
  const handleToggle = (moduleKey: string, actionKey: string) => {
    const currentModule = value[moduleKey as keyof Permissions] || { view: false, edit: false, delete: false };
    const newPermissions = {
      ...value,
      [moduleKey]: {
        ...currentModule,
        [actionKey]: !currentModule[actionKey as keyof Permission],
      },
    };
    onChange(newPermissions);
  };

  const handleSelectAll = (moduleKey: string) => {
    const currentModule = value[moduleKey as keyof Permissions] || { view: false, edit: false, delete: false };
    const allSelected = currentModule.view && currentModule.edit && currentModule.delete;

    const newPermissions = {
      ...value,
      [moduleKey]: {
        view: !allSelected,
        edit: !allSelected,
        delete: !allSelected,
      },
    };
    onChange(newPermissions);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        Permissões por Módulo
        <p className="text-xs text-gray-500 font-normal mt-1">
          Selecione as permissões específicas para cada área do sistema
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Módulo
              </th>
              {actions.map((action) => (
                <th
                  key={action.key}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {action.label}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Todos
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {modules.map((module) => {
              const modulePermissions = value[module.key as keyof Permissions] || { view: false, edit: false, delete: false };
              const allSelected = modulePermissions.view && modulePermissions.edit && modulePermissions.delete;

              return (
                <tr key={module.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {module.label}
                  </td>
                  {actions.map((action) => (
                    <td key={action.key} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={modulePermissions[action.key as keyof Permission] || false}
                        onChange={() => handleToggle(module.key, action.key)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => handleSelectAll(module.key)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• <strong>Ver:</strong> Permite visualizar os dados do módulo</p>
        <p>• <strong>Editar:</strong> Permite criar e modificar dados</p>
        <p>• <strong>Deletar:</strong> Permite excluir dados</p>
        <p>• <strong>Todos:</strong> Seleciona/desseleciona todas as permissões do módulo</p>
      </div>
    </div>
  );
};
