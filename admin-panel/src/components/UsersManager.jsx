/**
 * Gestor de Usuarios (UsersManager)
 * 
 * Permite listar, filtrar y administrar (mock) usuarios de la app móvil HistoriAR.
 * Incluye envío de mensajes (diálogo mock), bloqueo/desbloqueo y estadísticas rápidas.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  AlertCircle,
  CheckCircle,
  MapPin,
  Clock,
  ArrowLeft,
  Building,
  Phone,
  Mail,
  Globe,
  ChevronLeft,
  ChevronRight,
  Route,
  RefreshCcw,
  Send,
  Users,
  UserCheck,
  UserX,
  Search,
  MoreHorizontal,
  Ban,
  Activity,
  Smartphone
} from 'lucide-react';
import apiService from '../services/api';
import PropTypes from 'prop-types';
import { toast } from 'sonner';

// Etiquetas legibles para estado
const statusLabels = {
  'Activo': 'Activo',
  'Suspendido': 'Suspendido'
};

// Mapeo de colores de badge por estado
const statusColors = {
  'Activo': 'default',
  'Suspendido': 'destructive'
};

// Etiquetas legibles para roles
const roleLabels = {
  'user': 'Usuario',
  'admin': 'Administrador'
};

function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedUserForMessage, setSelectedUserForMessage] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUsers();
      // Filtrar para mostrar SOLO usuarios (no administradores) y que NO estén eliminados
      const allUsers = data.items || data || [];
      setUsers(allUsers.filter(u => u.role !== 'admin' && u.status !== 'Eliminado'));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleOpenMessageDialog = (user = null) => {
    setSelectedUserForMessage(user);
    setIsMessageDialogOpen(true);
  };

  // Filtro compuesto por nombre/email y estado
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Alterna estado activo/suspendido
  const handleStatusToggle = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Activo' ? 'Suspendido' : 'Activo';
      await apiService.updateUser(id, { status: newStatus });
      setUsers(prev => 
        prev.map(user => 
          user._id === id 
            ? { ...user, status: newStatus }
            : user
        )
      );
      toast.success(
        newStatus === 'Activo' 
          ? 'Usuario activado correctamente' 
          : 'Usuario suspendido correctamente'
      );
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Error al actualizar el estado del usuario');
    }
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios de la aplicación móvil HistoriAR
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          {/* Diálogo de mensaje a usuarios */}
          <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenMessageDialog(null)}>
                <Mail className="w-4 h-4" />
                Mensaje Masivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedUserForMessage 
                    ? `Enviar Mensaje a ${selectedUserForMessage.name}` 
                    : 'Enviar Mensaje a Usuarios'}
                </DialogTitle>
                <DialogDescription>
                  {selectedUserForMessage 
                    ? `El mensaje se enviará al correo ${selectedUserForMessage.email}` 
                    : 'Envía un correo electrónico o notificación push a los usuarios seleccionados'}
                </DialogDescription>
              </DialogHeader>
              <MessageForm 
                selectedUser={selectedUserForMessage} 
                onClose={() => setIsMessageDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                <SelectItem value="Activo">Usuarios Activos</SelectItem>
                <SelectItem value="Suspendido">Usuarios Suspendidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Usuarios App</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Usuarios Activos</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.status === 'Activo').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <UserX className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Usuarios Suspendidos</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.status === 'Suspendido').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            {filteredUsers.length} usuarios encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Distrito</TableHead>
                <TableHead>Fecha registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    <p className="mt-2 text-muted-foreground">Cargando usuarios...</p>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No se encontraron usuarios</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback>
                            {user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium">{user.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[user.status] || 'secondary'}>
                        {statusLabels[user.status] || user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{user.district || 'Sin distrito'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(user.createdAt).toLocaleDateString('es-PE')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenMessageDialog(user)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Enviar mensaje
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusToggle(user._id, user.status)}
                          >
                            {user.status === 'Activo' ? (
                              <>
                                <Ban className="mr-2 h-4 w-4" />
                                Suspender usuario
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activar usuario
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MessageForm({ onClose, selectedUser }) {
  const [messageType, setMessageType] = useState('email');
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState(selectedUser ? 'single' : 'all');
  const [deviceType, setDeviceType] = useState('all');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Por favor completa el asunto y el mensaje');
      return;
    }

    setLoading(true);
    // Simular envío
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(selectedUser 
        ? `Mensaje enviado a ${selectedUser.name}` 
        : 'Mensaje masivo enviado correctamente');
      onClose();
    } catch (error) {
      toast.error('Error al enviar el mensaje');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="message-type">Tipo de mensaje</Label>
          <Select value={messageType} onValueChange={setMessageType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Correo electrónico</SelectItem>
              <SelectItem value="push">Notificación push</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="recipients">Destinatarios</Label>
          {selectedUser ? (
            <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center">
              {selectedUser.email}
            </div>
          ) : (
            <Select value={recipients} onValueChange={setRecipients}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                <SelectItem value="active">Solo usuarios activos</SelectItem>
                <SelectItem value="suspended">Usuarios suspendidos</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {!selectedUser && (
        <div>
          <Label htmlFor="device-type">Dispositivo</Label>
          <Select value={deviceType} onValueChange={setDeviceType}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar dispositivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Todos los dispositivos
                </div>
              </SelectItem>
              <SelectItem value="android">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Android
                </div>
              </SelectItem>
              <SelectItem value="ios">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  iOS
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="subject">Asunto</Label>
        <Input 
          id="subject" 
          placeholder="Asunto del mensaje" 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="message">Mensaje</Label>
        <Textarea 
          id="message" 
          placeholder="Escribe tu mensaje aquí..."
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button onClick={handleSend} className="gap-2" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {loading ? 'Enviando...' : 'Enviar Mensaje'}
        </Button>
      </div>
    </div>
  );
}

export default UsersManager;

MessageForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  selectedUser: PropTypes.object
};
