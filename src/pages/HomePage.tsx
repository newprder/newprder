import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import {
  AppBar,
  Alert,
  Box,
  CircularProgress,
  Container,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { db } from '../lib/firebase';
import type { Item } from '../types';

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setItems(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Item),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
            NewPRder
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && items.length === 0 && (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 8 }}>
            No items yet. Add documents to the <code>items</code> collection in
            Firestore to see them here.
          </Typography>
        )}

        {!loading && !error && items.length > 0 && (
          <List>
            {items.map((item) => (
              <ListItem key={item.id} divider>
                <ListItemText
                  primary={item.title}
                  secondary={item.description}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Container>
    </>
  );
}
