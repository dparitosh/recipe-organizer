import { useEffect, useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Database, CheckCircle, Warning, Eye, EyeSlash } from '@phosphor-icons/react';
import { neo4jManager } from '@/lib/managers/neo4j-manager';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, NEO4J_CONSTANTS } from '@/lib/constants';
import { DEFAULT_NEO4J_CONFIG, neo4jConfigAtom, neo4jMockModeAtom } from '@/state/atoms';

export const Neo4jConfigPanel = ({ onConfigChange }) => {
  const [persistedConfig, setPersistedConfig] = useRecoilState(neo4jConfigAtom);
  const [mockMode, setMockMode] = useRecoilState(neo4jMockModeAtom);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  const config = useMemo(() => {
    const merged = {
      ...DEFAULT_NEO4J_CONFIG,
      ...(persistedConfig ?? {}),
    };

    if (!merged.database) {
      merged.database = NEO4J_CONSTANTS.DEFAULT_DATABASE;
    }

    return merged;
  }, [persistedConfig]);

  useEffect(() => {
    neo4jManager.setMockMode(mockMode ?? true);
  }, [mockMode]);

  useEffect(() => {
    onConfigChange?.({ ...config, mockMode: mockMode ?? true });
  }, [config, mockMode, onConfigChange]);

  const handleUpdateConfig = (field, value) => {
    setPersistedConfig((current) => ({
      ...DEFAULT_NEO4J_CONFIG,
      ...(current ?? {}),
      [field]: value,
    }));
    setConnectionStatus('unknown');
  };

  const handleToggleMockMode = (checked) => {
    setMockMode(() => checked);
    neo4jManager.setMockMode(checked);
    setConnectionStatus('unknown');
  };

  const handleTestConnection = async () => {
    if (!config || mockMode) return;

    setTesting(true);
    setConnectionStatus('unknown');

    try {
      const isConnected = await neo4jManager.testConnection({
        uri: config.uri,
        username: config.username,
        password: config.password,
        database: config.database,
      });

      if (isConnected) {
        setConnectionStatus('connected');
        toast.success(SUCCESS_MESSAGES.NEO4J.CONNECTED);
      } else {
        setConnectionStatus('failed');
        toast.error(ERROR_MESSAGES.NEO4J.CONNECTION_FAILED);
      }
    } catch (error) {
      setConnectionStatus('failed');
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED_ERROR;
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    try {
      if (!mockMode) {
        if (!config.uri || !config.username || !config.password) {
          toast.error('Please fill in all required fields before disabling mock mode.');
          return;
        }

        await neo4jManager.connect({
          uri: config.uri,
          username: config.username,
          password: config.password,
          database: config.database,
        });
        neo4jManager.setMockMode(false);
      } else {
        neo4jManager.setMockMode(true);
      }

      toast.success(SUCCESS_MESSAGES.NEO4J.CONFIG_SAVED);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED_ERROR;
      toast.error(errorMessage);
      console.error(error);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={24} className="text-primary" weight="bold" />
          <h3 className="font-semibold text-lg">Neo4j Configuration</h3>
        </div>
        {connectionStatus === 'connected' && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle size={18} weight="fill" />
            <span>Connected</span>
          </div>
        )}
        {connectionStatus === 'failed' && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <Warning size={18} weight="fill" />
            <span>Connection Failed</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Mock Mode</Label>
            <p className="text-xs text-muted-foreground">Use mock data instead of real Neo4j connection</p>
          </div>
          <Switch
            checked={mockMode ?? true}
            onCheckedChange={handleToggleMockMode}
          />
        </div>

        {!mockMode && (
          <>
            <div className="space-y-2">
              <Label htmlFor="neo4j-uri">Connection URI</Label>
              <Input
                id="neo4j-uri"
                value={config.uri}
                onChange={(e) => handleUpdateConfig('uri', e.target.value)}
                placeholder="neo4j+s://xxxxx.databases.neo4j.io"
              />
              <p className="text-xs text-muted-foreground">Use neo4j+s:// for secure connections, bolt:// for local</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="neo4j-username">Username</Label>
              <Input
                id="neo4j-username"
                value={config.username}
                onChange={(e) => handleUpdateConfig('username', e.target.value)}
                placeholder="neo4j"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="neo4j-password">Password</Label>
              <div className="relative">
                <Input
                  id="neo4j-password"
                  type={showPassword ? 'text' : 'password'}
                  value={config.password}
                  onChange={(e) => handleUpdateConfig('password', e.target.value)}
                  placeholder="Enter password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="neo4j-database">Database</Label>
              <Input
                id="neo4j-database"
                value={config.database}
                onChange={(e) => handleUpdateConfig('database', e.target.value)}
                placeholder="neo4j"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleTestConnection} disabled={testing} variant="outline" className="flex-1">
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button onClick={handleSaveConfig} className="flex-1">
                Save Configuration
              </Button>
            </div>
          </>
        )}

        {mockMode && (
          <div className="bg-accent/20 border border-accent rounded-lg p-4">
            <p className="text-sm text-accent-foreground">
              Mock mode is enabled. The application will use simulated data for all Neo4j operations. Switch to real mode
              to connect to your Neo4j database.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default Neo4jConfigPanel;
