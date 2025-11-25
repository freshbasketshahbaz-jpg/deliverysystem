import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { getRiders, createRider, changeRiderPassword } from '../utils/api';
import { Plus, Key } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function RidersPage() {
  const { accessToken } = useAuth();
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRider, setNewRider] = useState({ username: '', password: '', name: '' });

  useEffect(() => {
    loadRiders();
  }, []);

  const loadRiders = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await getRiders(accessToken);
      setRiders(data.riders);
    } catch (error) {
      console.error('Error loading riders:', error);
      toast.error('Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRider = async () => {
    if (!accessToken) return;
    if (!newRider.username || !newRider.password || !newRider.name) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await createRider(accessToken, newRider);
      toast.success('Rider created successfully');
      setShowAddDialog(false);
      setNewRider({ username: '', password: '', name: '' });
      loadRiders();
    } catch (error: any) {
      console.error('Error creating rider:', error);
      toast.error(error.message || 'Failed to create rider');
    }
  };

  const handleChangePassword = async (riderId: string, newPassword: string) => {
    if (!accessToken) return;
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    try {
      await changeRiderPassword(accessToken, riderId, newPassword);
      toast.success('Password changed successfully');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2>Riders</h2>
          <p className="text-gray-600 mt-1">Manage delivery riders</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Rider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Rider</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newRider.name}
                  onChange={(e) => setNewRider({ ...newRider, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={newRider.username}
                  onChange={(e) => setNewRider({ ...newRider, username: e.target.value })}
                  placeholder="rider1"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={newRider.password}
                  onChange={(e) => setNewRider({ ...newRider, password: e.target.value })}
                  placeholder="Strong password"
                />
              </div>
              <Button onClick={handleAddRider} className="w-full">
                Create Rider
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Username</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Loading riders...
                </td>
              </tr>
            ) : riders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No riders yet
                </td>
              </tr>
            ) : (
              riders.map((rider, index) => (
                <tr key={rider.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3">{rider.name}</td>
                  <td className="px-4 py-3">{rider.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs ${
                        rider.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {rider.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Key className="size-4 mr-1" />
                          Change Password
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change Password for {rider.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input
                              type="password"
                              id={`password-${rider.id}`}
                              placeholder="Enter new password"
                            />
                          </div>
                          <Button
                            onClick={() => {
                              const input = document.getElementById(
                                `password-${rider.id}`
                              ) as HTMLInputElement;
                              handleChangePassword(rider.id, input.value);
                            }}
                            className="w-full"
                          >
                            Update Password
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
