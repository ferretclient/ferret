import { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { cloneDeep, find } from 'lodash';
import { IconLoader2 } from '@tabler/icons';
import { interpolate } from '@useferret/common';
import { fetchOauth2Credentials, clearOauth2Cache, refreshOauth2Credentials } from 'providers/ReduxStore/slices/collections/actions';
import { responseReceived } from 'providers/ReduxStore/slices/collections';
import { updateResponsePaneTab } from 'providers/ReduxStore/slices/tabs';
import { getAllVariables } from 'utils/collections/index';
import { formatIpcError } from 'utils/common/error';
import Button from 'ui/Button';

const Oauth2ActionButtons = ({ item, request, collection, url: accessTokenUrl, credentialsId, disabled }) => {
  const { uid: collectionUid } = collection;

  const dispatch = useDispatch();
  const [fetchingToken, toggleFetchingToken] = useState(false);
  const [refreshingToken, toggleRefreshingToken] = useState(false);

  const interpolatedAccessTokenUrl = useMemo(() => {
    const variables = getAllVariables(collection, item);
    return interpolate(accessTokenUrl, variables);
  }, [collection, item, accessTokenUrl]);

  const credentialsData = find(collection?.oauth2Credentials, (creds) => creds?.url == interpolatedAccessTokenUrl && creds?.collectionUid == collectionUid && creds?.credentialsId == credentialsId);
  const creds = credentialsData?.credentials || {};

  const showOauth2Error = (errorMessage) => {
    dispatch(
      responseReceived({
        itemUid: item.uid,
        collectionUid,
        response: {
          error: errorMessage,
          isError: true,
          status: 'Error',
          size: 0,
          duration: 0
        }
      })
    );
    dispatch(updateResponsePaneTab({ uid: item.uid, responsePaneTab: 'response' }));
  };

  const handleFetchOauth2Credentials = async () => {
    let requestCopy = cloneDeep(request);
    requestCopy.oauth2 = requestCopy?.auth.oauth2;
    requestCopy.headers = {};
    toggleFetchingToken(true);
    try {
      const result = await dispatch(fetchOauth2Credentials({
        itemUid: item.uid,
        request: requestCopy,
        collection,
        forceGetToken: true
      }));

      // Check if the result contains error or if access_token is missing
      if (!result || !result.access_token) {
        const errorMessage = result?.error || 'No access token received from authorization server';
        console.error(errorMessage);
        toast.error(errorMessage);
        showOauth2Error(errorMessage);
        return;
      }

      toast.success('Token fetched successfully!');
    } catch (error) {
      console.error('could not fetch the token!');
      console.error(error);
      // Don't show error toast for user cancellation
      if (error?.message && error.message.includes('cancelled by user')) {
        return;
      }
      const errorMessage = formatIpcError(error) || 'An error occurred while fetching token!';
      toast.error(errorMessage);
      showOauth2Error(errorMessage);
    } finally {
      toggleFetchingToken(false);
    }
  };

  const handleRefreshAccessToken = async () => {
    let requestCopy = cloneDeep(request);
    requestCopy.oauth2 = requestCopy?.auth.oauth2;
    requestCopy.headers = {};
    toggleRefreshingToken(true);
    try {
      const result = await dispatch(refreshOauth2Credentials({
        itemUid: item.uid,
        request: requestCopy,
        collection,
        forceGetToken: true
      }));

      toggleRefreshingToken(false);

      // Check if the result contains error or if access_token is missing
      if (!result || !result.access_token) {
        const errorMessage = result?.error || 'No access token received from authorization server';
        console.error(errorMessage);
        toast.error(errorMessage);
        return;
      }

      toast.success('Token refreshed successfully!');
    } catch (error) {
      console.error(error);
      toggleRefreshingToken(false);
      const errorMessage = formatIpcError(error) || 'An error occurred while refreshing token!';
      toast.error(errorMessage);
    }
  };

  const handleClearCache = (e) => {
    dispatch(clearOauth2Cache({ collectionUid: collection?.uid, url: interpolatedAccessTokenUrl, credentialsId }))
      .then(() => {
        toast.success('Cleared cache successfully');
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  return (
    <div className="flex flex-row gap-2 mt-4">
      <Button
        size="sm"
        color="secondary"
        onClick={handleFetchOauth2Credentials}
        disabled={disabled || fetchingToken || refreshingToken}
        loading={fetchingToken}
      >
        Get Access Token
      </Button>
      {creds?.refresh_token
        ? (
            <Button
              size="sm"
              color="secondary"
              onClick={handleRefreshAccessToken}
              disabled={disabled || fetchingToken || refreshingToken}
              loading={refreshingToken}
            >
              Refresh Token
            </Button>
          )
        : null}
      <Button
        size="sm"
        color="secondary"
        variant="ghost"
        onClick={handleClearCache}
        disabled={disabled}
      >
        Clear Cache
      </Button>
    </div>
  );
};

export default Oauth2ActionButtons;
